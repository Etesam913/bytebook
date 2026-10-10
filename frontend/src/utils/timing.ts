/**
 * Fires immediately, then at most once per `wait` ms. Calls inside the window
 * are coalesced into one trailing call.
 */
export function throttle<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  wait = 300
): (...args: TArgs) => TResult | undefined {
  let inThrottle = false;
  let lastFn: ReturnType<typeof setTimeout> | undefined;
  let lastTime = 0;

  return (...args: TArgs) => {
    if (!inThrottle) {
      const result = fn(...args);
      lastTime = Date.now();
      inThrottle = true;
      return result;
    }
    clearTimeout(lastFn);
    lastFn = setTimeout(
      () => {
        if (Date.now() - lastTime >= wait) {
          fn(...args);
          lastTime = Date.now();
        }
      },
      Math.max(wait - (Date.now() - lastTime), 0)
    );
    return undefined;
  };
}

/**
 * Creates a leading-edge throttle gate keyed by string. Returns a function
 * that yields true if the caller should proceed (and records the timestamp),
 * or false if the same key was allowed less than `ms` milliseconds ago.
 */
export function createLeadingThrottle(ms: number) {
  const lastAllowedAt = new Map<string, number>();
  return (key: string): boolean => {
    const now = Date.now();
    const last = lastAllowedAt.get(key) ?? 0;
    if (now - last < ms) return false;
    lastAllowedAt.set(key, now);
    return true;
  };
}
export type Debounced<TArgs extends unknown[]> = {
  (...args: TArgs): void;
  /** Runs the pending call now, if there is one */
  flush: () => void;
  /** Drops the pending call without running it */
  cancel: () => void;
  /** Swaps in the callback that pending and future calls will run */
  setFn: (fn: (...args: TArgs) => void) => void;
};
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
