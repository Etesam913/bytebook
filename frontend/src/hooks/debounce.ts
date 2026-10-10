import { useLayoutEffect, useState } from 'react';

export type Debounced<TArgs extends unknown[]> = {
  (...args: TArgs): void;
  /** Runs the pending call now, if there is one */
  flush: () => void;
  /** Drops the pending call without running it */
  cancel: () => void;
  /** Swaps in the callback that pending and future calls will run */
  setFn: (fn: (...args: TArgs) => void) => void;
};

/**
 * Debounce scoped to the calling component. The returned function is stable across
 * renders, so a pending call is always cancelable, and it always runs the latest `fn`.
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  ms: number
): Debounced<TArgs> {
  const [debounced] = useState(() => createDebounced(fn, ms));
  useLayoutEffect(() => {
    debounced.setFn(fn);
  }, [debounced, fn]);
  return debounced;
}

export function createDebounced<TArgs extends unknown[]>(
  initialFn: (...args: TArgs) => void,
  ms: number
): Debounced<TArgs> {
  let fn = initialFn;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: TArgs | null = null;

  function run() {
    timeoutId = null;
    const args = pendingArgs;
    pendingArgs = null;
    if (args) fn(...args);
  }

  function debounced(...args: TArgs) {
    if (timeoutId !== null) clearTimeout(timeoutId);
    pendingArgs = args;
    timeoutId = setTimeout(run, ms);
  }

  function flush() {
    if (timeoutId === null) return;
    clearTimeout(timeoutId);
    run();
  }

  function cancel() {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = null;
    pendingArgs = null;
  }

  function setFn(next: (...args: TArgs) => void) {
    fn = next;
  }

  return Object.assign(debounced, { flush, cancel, setFn });
}
