import type { BrowserContext, Page } from '@playwright/test';

/**
 * Tracks which contexts have already been set up for event handling.
 */
const setupContexts = new WeakSet<BrowserContext>();

/**
 * Gives browser events the window identity used by emitWailsEvent.
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
}

// Dispatch through the same Wails runtime used by the application listeners.
export async function emitWailsEvent(
  page: Page,
  eventName: string,
  data: unknown,
  sender = 'test'
): Promise<void> {
  await page.evaluate(
    ({ eventName, data, sender }) => {
      const globalWindow = window as typeof window & {
        _wails: {
          dispatchWailsEvent: (event: {
            name: string;
            data: unknown;
            sender: string;
          }) => void;
        };
      };
      globalWindow._wails.dispatchWailsEvent({ name: eventName, data, sender });
    },
    { eventName, data, sender }
  );
}
