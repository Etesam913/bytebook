import '@/test/setup';
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { DEFAULT_SONNER_OPTIONS } from '@utils/general';
const openUrl = mock<(url: string) => Promise<void>>(() => Promise.resolve());
const toastError = mock<(message: string, options?: unknown) => void>(() => {});

// Bun's mock.module is global across the test run, so this stub must
// cover every namespace any other test's transitive imports may touch.
void mock.module('@wailsio/runtime', () => ({
  Application: {},
  Browser: { OpenURL: openUrl },
  Call: {},
  Clipboard: {},
  Create: {
    Any: (source: unknown) => source,
    ByteSlice: (source: unknown) => source,
    Array: () => (source: unknown) => source,
    Map: () => (source: unknown) => source,
    Nullable: () => (source: unknown) => source,
    Struct: () => (source: unknown) => source,
    Events: {},
  },
  Dialogs: {},
  Events: { On: () => () => {}, Emit: () => {}, Off: () => {} },
  Flags: {},
  IOS: {},
  Screens: {},
  System: {},
  Window: {},
  WML: {},
  setTransport: () => {},
  getTransport: () => undefined,
  objectNames: {},
  clientId: '',
  CancelError: class extends Error {},
  CancelledRejectionError: class extends Error {},
  CancellablePromise: Promise,
}));

void mock.module('sonner', () => ({
  toast: {
    error: toastError,
  },
}));

const { openLinkInBrowser } = await import('./link');

describe('editor link utils', () => {
  beforeEach(() => {
    openUrl.mockReset();
    toastError.mockReset();
  });

  it('opens regular links via the runtime browser', () => {
    openUrl.mockImplementation(() => Promise.resolve(undefined));

    openLinkInBrowser('https://example.com/docs');

    expect(openUrl).toHaveBeenCalledWith('https://example.com/docs');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('reports a toast when the runtime refuses to open the link', async () => {
    openUrl.mockImplementation(() => {
      return Promise.reject(new Error('network'));
    });
    openLinkInBrowser('https://example.com/fail');
    await Promise.resolve();

    expect(toastError).toHaveBeenCalledWith(
      'Failed to open link: https://example.com/fail',
      DEFAULT_SONNER_OPTIONS
    );
  });
});
