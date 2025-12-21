import type { BrowserContext, Page } from '@playwright/test';

/**
 * Represents a Wails event structure matching the app's WailsEvent type.
 */
export type WailsEvent = {
  name: string;
  sender: string;
  data: unknown;
};

/**
 * Tracks which contexts have already been set up for event handling.
 */
const setupContexts = new WeakSet<BrowserContext>();

/**
 * Sets up the browser context to support Wails event emission.
 * This injects a global function that can emit events to all registered listeners.
 *
 * Call this once per context, typically in beforeEach.
 */
export async function setupWailsEvents(context: BrowserContext): Promise<void> {
  if (setupContexts.has(context)) return;
  setupContexts.add(context);

  await context.addInitScript(() => {
    const globalWindow = window as typeof window & {
      __BYTEBOOK_WAILS_EVENT_LISTENERS__?: Map<
        string,
        Set<(event: { name: string; sender: string; data: unknown }) => void>
      >;
      __BYTEBOOK_EMIT_WAILS_EVENT__?: (
        name: string,
        data: unknown,
        sender?: string
      ) => void;
      __BYTEBOOK_CAPTURED_EVENTS__?: Array<{
        name: string;
        sender: string;
        data: unknown;
        timestamp: number;
      }>;
      __BYTEBOOK_CAPTURE_EVENT__?: (name: string) => void;
      __BYTEBOOK_EVENTS_TO_CAPTURE__?: Set<string>;
    };

    // Store for event listeners registered by the app
    const listeners = new Map<
      string,
      Set<(event: { name: string; sender: string; data: unknown }) => void>
    >();
    globalWindow.__BYTEBOOK_WAILS_EVENT_LISTENERS__ = listeners;

    // Store for captured events
    globalWindow.__BYTEBOOK_CAPTURED_EVENTS__ = [];
    globalWindow.__BYTEBOOK_EVENTS_TO_CAPTURE__ = new Set();

    // Function to mark an event for capturing
    globalWindow.__BYTEBOOK_CAPTURE_EVENT__ = (name: string) => {
      globalWindow.__BYTEBOOK_EVENTS_TO_CAPTURE__?.add(name);
    };

    // Function to emit events from test code
    globalWindow.__BYTEBOOK_EMIT_WAILS_EVENT__ = (
      name: string,
      data: unknown,
      sender = 'test'
    ) => {
      const event = { name, sender, data };

      // Capture if this event is being watched
      if (globalWindow.__BYTEBOOK_EVENTS_TO_CAPTURE__?.has(name)) {
        globalWindow.__BYTEBOOK_CAPTURED_EVENTS__?.push({
          ...event,
          timestamp: Date.now(),
        });
      }

      // Emit to all registered listeners for this event
      const eventListeners = listeners.get(name);
      if (eventListeners) {
        for (const listener of eventListeners) {
          try {
            listener(event);
          } catch (error) {
            console.error(
              `Error in Wails event listener for "${name}":`,
              error
            );
          }
        }
      }
    };

    // Patch the Wails runtime Events.On to capture registrations
    // We need to wait for the Wails runtime to be available
    const patchWailsRuntime = () => {
      // Check if we're in an environment where @wailsio/runtime is loaded
      // The runtime typically exposes itself or is imported by the app

      // Intercept custom event dispatching for Wails events
      const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
      EventTarget.prototype.dispatchEvent = function (event: Event) {
        // Capture custom events that might be Wails events
        if (
          event instanceof CustomEvent &&
          globalWindow.__BYTEBOOK_EVENTS_TO_CAPTURE__?.has(event.type)
        ) {
          globalWindow.__BYTEBOOK_CAPTURED_EVENTS__?.push({
            name: event.type,
            sender: 'app',
            data: event.detail,
            timestamp: Date.now(),
          });
        }
        return originalDispatchEvent.call(this, event);
      };
    };

    patchWailsRuntime();

    // Also patch window message events which Wails might use
    window.addEventListener('message', (event) => {
      if (
        event.data?.type === 'wails-event' &&
        globalWindow.__BYTEBOOK_EVENTS_TO_CAPTURE__?.has(event.data.name)
      ) {
        globalWindow.__BYTEBOOK_CAPTURED_EVENTS__?.push({
          name: event.data.name,
          sender: event.data.sender || 'unknown',
          data: event.data.data,
          timestamp: Date.now(),
        });
      }
    });
  });

  // Patch the Wails Events.On function to register listeners with our store
  await context.addInitScript(() => {
    type WailsEventCallback = (event: {
      name: string;
      sender: string;
      data: unknown;
    }) => void;

    const globalWindow = window as typeof window & {
      __BYTEBOOK_WAILS_EVENT_LISTENERS__?: Map<string, Set<WailsEventCallback>>;
      __BYTEBOOK_ORIGINAL_WAILS_ON__?: (
        eventName: string,
        callback: WailsEventCallback
      ) => () => void;
    };

    let wailsPatched = false;

    // Use a MutationObserver to detect when scripts are added
    const observer = new MutationObserver(() => {
      if (wailsPatched) return;

      // Try to find and patch the Wails Events object
      // The @wailsio/runtime exports Events which has an On method
      const tryPatchWails = () => {
        // Access through window if the runtime exposes it globally
        const wailsRuntime = (
          window as {
            wails?: {
              Events?: {
                On?: (
                  eventName: string,
                  callback: WailsEventCallback
                ) => () => void;
              };
            };
          }
        ).wails;
        if (wailsRuntime?.Events?.On) {
          const originalOn = wailsRuntime.Events.On.bind(wailsRuntime.Events);
          globalWindow.__BYTEBOOK_ORIGINAL_WAILS_ON__ = originalOn;

          wailsRuntime.Events.On = (
            eventName: string,
            callback: (event: {
              name: string;
              sender: string;
              data: unknown;
            }) => void
          ) => {
            // Register with our listener store
            const listeners = globalWindow.__BYTEBOOK_WAILS_EVENT_LISTENERS__;
            if (listeners) {
              if (!listeners.has(eventName)) {
                listeners.set(eventName, new Set());
              }
              listeners.get(eventName)!.add(callback);
            }

            // Return a cleanup function
            return () => {
              listeners?.get(eventName)?.delete(callback);
            };
          };

          wailsPatched = true;
          observer.disconnect();
        }
      };

      tryPatchWails();
    });

    observer.observe(document, { childList: true, subtree: true });

    // Also try immediately in case Wails is already loaded
    setTimeout(() => {
      if (!wailsPatched) {
        observer.disconnect();
      }
    }, 5000);
  });
}

/**
 * Emits a Wails event to all registered listeners in the page.
 * Use this to trigger useWailsEvent callbacks in your components.
 *
 * This uses the Wails runtime's internal dispatchWailsEvent function
 * which is set up on window._wails.
 *
 * @param page - The Playwright page instance
 * @param eventName - The name of the event (e.g., 'settings:update', 'folder:created')
 * @param data - The event payload data
 * @param sender - Optional sender identifier (defaults to 'test')
 *
 * @example
 * ```ts
 * await emitWailsEvent(page, 'settings:update', {
 *   appearance: { theme: 'dark' }
 * });
 * ```
 */
export async function emitWailsEvent(
  page: Page,
  eventName: string,
  data: unknown,
  sender = 'test'
): Promise<void> {
  await page.evaluate(
    ({ eventName, data, sender }) => {
      const globalWindow = window as typeof window & {
        _wails?: {
          dispatchWailsEvent?: (event: {
            name: string;
            data: unknown;
            sender?: string;
          }) => void;
        };
        __BYTEBOOK_EMIT_WAILS_EVENT__?: (
          name: string,
          data: unknown,
          sender?: string
        ) => void;
      };

      // Try to use the Wails runtime's built-in event dispatcher first
      if (globalWindow._wails?.dispatchWailsEvent) {
        globalWindow._wails.dispatchWailsEvent({
          name: eventName,
          data,
          sender,
        });
        return;
      }

      // Fall back to our custom emitter
      if (globalWindow.__BYTEBOOK_EMIT_WAILS_EVENT__) {
        globalWindow.__BYTEBOOK_EMIT_WAILS_EVENT__(eventName, data, sender);
        return;
      }

      throw new Error(
        'Neither Wails runtime nor test event system is available. ' +
          'Make sure setupWailsEvents(context) was called in beforeEach.'
      );
    },
    { eventName, data, sender }
  );
}

/**
 * Starts capturing events with the specified name.
 * Captured events can later be retrieved with getCapturedEvents.
 *
 * @param page - The Playwright page instance
 * @param eventName - The event name to capture
 *
 * @example
 * ```ts
 * await captureWailsEvent(page, 'note:saved');
 * // ... perform actions that trigger the event ...
 * const events = await getCapturedEvents(page, 'note:saved');
 * ```
 */
export async function captureWailsEvent(
  page: Page,
  eventName: string
): Promise<void> {
  await page.evaluate(
    ({ eventName }) => {
      const globalWindow = window as typeof window & {
        __BYTEBOOK_CAPTURE_EVENT__?: (name: string) => void;
      };

      globalWindow.__BYTEBOOK_CAPTURE_EVENT__?.(eventName);
    },
    { eventName }
  );
}

/**
 * Retrieves all captured events with the specified name.
 *
 * @param page - The Playwright page instance
 * @param eventName - The event name to filter by (optional, returns all if not provided)
 * @returns Array of captured events with their data and timestamps
 */
export async function getCapturedEvents(
  page: Page,
  eventName?: string
): Promise<
  Array<{ name: string; sender: string; data: unknown; timestamp: number }>
> {
  return await page.evaluate(
    ({ eventName }) => {
      const globalWindow = window as typeof window & {
        __BYTEBOOK_CAPTURED_EVENTS__?: Array<{
          name: string;
          sender: string;
          data: unknown;
          timestamp: number;
        }>;
      };

      const events = globalWindow.__BYTEBOOK_CAPTURED_EVENTS__ || [];
      if (eventName) {
        return events.filter((e) => e.name === eventName);
      }
      return events;
    },
    { eventName }
  );
}

/**
 * Clears all captured events.
 *
 * @param page - The Playwright page instance
 */
export async function clearCapturedEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    const globalWindow = window as typeof window & {
      __BYTEBOOK_CAPTURED_EVENTS__?: Array<unknown>;
    };

    if (globalWindow.__BYTEBOOK_CAPTURED_EVENTS__) {
      globalWindow.__BYTEBOOK_CAPTURED_EVENTS__.length = 0;
    }
  });
}

/**
 * Waits for a specific Wails event to be emitted.
 * Returns the event data when the event is captured.
 *
 * @param page - The Playwright page instance
 * @param eventName - The event name to wait for
 * @param options - Optional configuration
 * @param options.timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns The event data when captured
 *
 * @example
 * ```ts
 * const settingsData = await waitForWailsEvent(page, 'settings:update');
 * expect(settingsData.appearance.theme).toBe('dark');
 * ```
 */
export async function waitForWailsEvent(
  page: Page,
  eventName: string,
  options: { timeout?: number } = {}
): Promise<WailsEvent> {
  const { timeout = 5000 } = options;

  // Start capturing the event
  await captureWailsEvent(page, eventName);

  const startTime = Date.now();
  const initialCount = (await getCapturedEvents(page, eventName)).length;

  // Poll for new events
  while (Date.now() - startTime < timeout) {
    const events = await getCapturedEvents(page, eventName);
    if (events.length > initialCount) {
      const newEvent = events[events.length - 1];
      return {
        name: newEvent.name,
        sender: newEvent.sender,
        data: newEvent.data,
      };
    }
    await page.waitForTimeout(50);
  }

  throw new Error(`Timeout waiting for Wails event "${eventName}"`);
}

/**
 * Creates a helper object for working with Wails events in a test.
 * Provides a fluent API for common event operations.
 *
 * @param page - The Playwright page instance
 * @returns An object with event helper methods
 *
 * @example
 * ```ts
 * const events = createWailsEventHelper(page);
 *
 * // Emit an event
 * await events.emit('settings:update', { theme: 'dark' });
 *
 * // Wait for an event
 * const data = await events.waitFor('note:saved');
 *
 * // Capture and check events
 * await events.startCapturing('folder:created');
 * // ... perform actions ...
 * const captured = await events.getCaptured('folder:created');
 * ```
 */
export function createWailsEventHelper(page: Page) {
  return {
    /**
     * Emits a Wails event to all registered listeners.
     */
    emit: (eventName: string, data: unknown, sender = 'test') =>
      emitWailsEvent(page, eventName, data, sender),

    /**
     * Starts capturing events with the specified name.
     */
    startCapturing: (eventName: string) => captureWailsEvent(page, eventName),

    /**
     * Gets all captured events, optionally filtered by name.
     */
    getCaptured: (eventName?: string) => getCapturedEvents(page, eventName),

    /**
     * Clears all captured events.
     */
    clearCaptured: () => clearCapturedEvents(page),

    /**
     * Waits for a specific event to be emitted.
     */
    waitFor: (eventName: string, options?: { timeout?: number }) =>
      waitForWailsEvent(page, eventName, options),
  };
}
