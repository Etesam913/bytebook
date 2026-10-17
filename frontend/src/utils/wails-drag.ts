/**
 * On macOS (and Linux) the Wails runtime intercepts OS-level file drags
 * natively, so DOM `dragenter` / `dragover` / `drop` events never fire in
 * JS. Wails bridges this by exposing `window._wails.handleDragEnter`,
 * `handleDragOver(x, y)`, `handleDragLeave`, and `handlePlatformFileDrop`
 * globals that the native runtime invokes directly.
 *
 * This module lets multiple features (the file tree, the editor) observe
 * those globals through a shared set of subscribers.
 */

type WailsDragGlobals = {
  handleDragEnter?: () => void;
  handleDragOver?: (x: number, y: number) => void;
  handleDragLeave?: () => void;
  handlePlatformFileDrop?: (filenames: string[], x: number, y: number) => void;
};

type WailsDragHandlers = {
  onDragEnter?: () => void;
  onDragOver?: (x: number, y: number) => void;
  onDragLeave?: () => void;
  onPlatformFileDrop?: (filenames: string[], x: number, y: number) => void;
};

const registrations = new WeakMap<
  WailsDragGlobals,
  { handlers: Set<WailsDragHandlers>; restore: () => void }
>();

function getWailsGlobals(): WailsDragGlobals | undefined {
  return (window as unknown as { _wails?: WailsDragGlobals })._wails;
}

/**
 * Installs handlers that run alongside the Wails runtime's native file-drag
 * globals. Handlers run *after* the original for enter/over/leave, and
 * *before* the original for `onPlatformFileDrop` so that cleanup (e.g.
 * hiding drop carets, clearing highlights) completes before the runtime
 * commits the native drop — on macOS the runtime's private
 * `cleanupNativeDrag` bypasses `handleDragLeave`.
 *
 * Returns a cleanup function that removes this subscriber, or `null`
 * when `window._wails` isn't available (e.g. outside the Wails runtime).
 */
export function installWailsDragHandlers(
  handlers: WailsDragHandlers
): (() => void) | null {
  const globals = getWailsGlobals();
  if (!globals) return null;

  let registration = registrations.get(globals);
  if (!registration) {
    registration = createRegistration(globals);
    registrations.set(globals, registration);
  }

  // Each installation owns its subscription, even if callers reuse an object.
  const subscriber = { ...handlers };
  registration.handlers.add(subscriber);

  return () => {
    if (!registration.handlers.delete(subscriber)) return;
    if (registration.handlers.size === 0) {
      registration.restore();
      registrations.delete(globals);
    }
  };
}

function createRegistration(globals: WailsDragGlobals) {
  const handlers = new Set<WailsDragHandlers>();
  const originalEnter = globals.handleDragEnter;
  const originalOver = globals.handleDragOver;
  const originalLeave = globals.handleDragLeave;
  const originalDrop = globals.handlePlatformFileDrop;

  globals.handleDragEnter = () => {
    originalEnter?.();
    for (const subscriber of handlers) subscriber.onDragEnter?.();
  };
  globals.handleDragOver = (x, y) => {
    originalOver?.(x, y);
    for (const subscriber of handlers) subscriber.onDragOver?.(x, y);
  };
  globals.handleDragLeave = () => {
    originalLeave?.();
    for (const subscriber of handlers) subscriber.onDragLeave?.();
  };
  globals.handlePlatformFileDrop = (filenames, x, y) => {
    for (const subscriber of handlers)
      subscriber.onPlatformFileDrop?.(filenames, x, y);
    originalDrop?.(filenames, x, y);
  };

  return {
    handlers,
    restore: () => {
      globals.handleDragEnter = originalEnter;
      globals.handleDragOver = originalOver;
      globals.handleDragLeave = originalLeave;
      globals.handlePlatformFileDrop = originalDrop;
    },
  };
}
