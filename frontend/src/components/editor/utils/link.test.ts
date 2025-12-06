import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { DEFAULT_SONNER_OPTIONS } from '../../../utils/general';
const openUrl = mock<(url: string) => Promise<void>>(() => Promise.resolve());
const toastError = mock<(message: string, options?: unknown) => void>(() => {});

mock.module('@wailsio/runtime', () => ({
  Browser: {
    OpenURL: openUrl,
  },
}));

mock.module('sonner', () => ({
  toast: {
    error: toastError,
  },
}));

const { handleATagClick, sanitizeUrl } = await import('./link');

describe('editor link utils', () => {
  beforeEach(() => {
    openUrl.mockReset();
    toastError.mockReset();
  });

  it('opens regular links via the runtime browser', () => {
    openUrl.mockImplementation(async () => undefined);
    const anchor = document.createElement('a');
    anchor.href = 'https://example.com/docs';
    const child = document.createElement('span');
    anchor.append(child);

    handleATagClick(child);

    expect(openUrl).toHaveBeenCalledWith('https://example.com/docs');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('reports a toast when the runtime refuses to open the link', async () => {
    openUrl.mockImplementation(async () => {
      throw new Error('network');
    });
    const anchor = document.createElement('a');
    anchor.href = 'https://example.com/fail';
    const child = document.createElement('span');
    anchor.append(child);

    handleATagClick(child);
    await Promise.resolve();

    expect(toastError).toHaveBeenCalledWith(
      'Failed to open link: https://example.com/fail',
      DEFAULT_SONNER_OPTIONS
    );
  });

  it('sanitizes unsupported protocols while keeping unparsable input', () => {
    expect(sanitizeUrl('mailto:hello@example.com')).toBe(
      'mailto:hello@example.com'
    );
    expect(sanitizeUrl('ftp://bad.example')).toBe('about:blank');
    expect(sanitizeUrl('not a url')).toBe('not a url');
  });
});
