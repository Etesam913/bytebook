/**
 * On macOS (and Linux) the Wails runtime intercepts OS-level file drags
 * natively, so DOM `dragenter` / `dragover` / `drop` events never fire in
 * JS. Wails bridges this by exposing `window._wails.handleDragEnter`,
 * `handleDragOver(x, y)`, `handleDragLeave`, and `handlePlatformFileDrop`
 * globals that the native runtime invokes directly.
 *
 * This module lets multiple features (the file tree, the editor) observe
 * those globals without stomping each other by chaining wrappers around
 * the existing handlers.
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
 * Returns a cleanup function that restores the prior handlers, or `null`
 * when `window._wails` isn't available (e.g. outside the Wails runtime).
 */
export function installWailsDragHandlers(
  handlers: WailsDragHandlers
): (() => void) | null {
  const globals = getWailsGlobals();
  if (!globals) return null;

  const originalEnter = globals.handleDragEnter;
  const originalOver = globals.handleDragOver;
  const originalLeave = globals.handleDragLeave;
  const originalDrop = globals.handlePlatformFileDrop;

  if (handlers.onDragEnter) {
    globals.handleDragEnter = () => {
      originalEnter?.();
      handlers.onDragEnter?.();
    };
  }
  if (handlers.onDragOver) {
    globals.handleDragOver = (x, y) => {
      originalOver?.(x, y);
      handlers.onDragOver?.(x, y);
    };
  }
  if (handlers.onDragLeave) {
    globals.handleDragLeave = () => {
      originalLeave?.();
      handlers.onDragLeave?.();
    };
  }
  if (handlers.onPlatformFileDrop) {
    globals.handlePlatformFileDrop = (filenames, x, y) => {
      handlers.onPlatformFileDrop?.(filenames, x, y);
      originalDrop?.(filenames, x, y);
    };
  }

  return () => {
    if (handlers.onDragEnter) globals.handleDragEnter = originalEnter;
    if (handlers.onDragOver) globals.handleDragOver = originalOver;
    if (handlers.onDragLeave) globals.handleDragLeave = originalLeave;
    if (handlers.onPlatformFileDrop)
      globals.handlePlatformFileDrop = originalDrop;
  };
}
