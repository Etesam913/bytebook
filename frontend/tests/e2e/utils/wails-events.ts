import type { BrowserContext, Page } from '@playwright/test';

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

  // Native events are scoped to their sender window. Vite has no runtime to
  // answer Window.Name(), so use the same window identity as emitWailsEvent.
  await context.route('**/wails/runtime', async (route) => {
    const body = route.request().postDataJSON() as {
      object: number;
      method: number;
    };
    if (body.object === 6 && body.method === 18) {
      await route.fulfill({ json: 'test' });
    } else {
      await route.fallback();
    }
  });

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
    };

    // Store for event listeners registered by the app
    const listeners = new Map<
      string,
      Set<(event: { name: string; sender: string; data: unknown }) => void>
    >();
    globalWindow.__BYTEBOOK_WAILS_EVENT_LISTENERS__ = listeners;

    // Function to emit events from test code
    globalWindow.__BYTEBOOK_EMIT_WAILS_EVENT__ = (
      name: string,
      data: unknown,
      sender = 'test'
    ) => {
      const event = { name, sender, data };

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
