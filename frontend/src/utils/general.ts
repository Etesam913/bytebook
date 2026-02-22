export const WAILS_URL = 'wails:';

export const DEFAULT_SONNER_OPTIONS = {
  dismissible: true,
  duration: 3500,
  closeButton: true,
};

export const MAX_SIDEBAR_WIDTH = 350;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};
