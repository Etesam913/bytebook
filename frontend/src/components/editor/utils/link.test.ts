import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SONNER_OPTIONS } from '../../../utils/general';
import { handleATagClick, sanitizeUrl } from './link';

const openUrl = vi.fn();
const toastError = vi.fn();

vi.mock('@wailsio/runtime', () => ({
  Browser: {
    OpenURL: openUrl,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
  },
}));

describe('editor link utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens regular links via the runtime browser', () => {
    openUrl.mockResolvedValue(undefined);
    const anchor = document.createElement('a');
    anchor.href = 'https://example.com/docs';
    const child = document.createElement('span');
    anchor.append(child);

    handleATagClick(child);

    expect(openUrl).toHaveBeenCalledWith('https://example.com/docs');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('reports a toast when the runtime refuses to open the link', async () => {
    openUrl.mockRejectedValue(new Error('network'));
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
