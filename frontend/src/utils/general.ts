export const WAILS_URL = 'wails:';

export const DEFAULT_SONNER_OPTIONS = {
  dismissible: true,
  duration: 4000,
  closeButton: true,
};

export const MAX_SIDEBAR_WIDTH = 500;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: unknown[]) {
    clearTimeout(timeoutId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

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
