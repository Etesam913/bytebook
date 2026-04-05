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
