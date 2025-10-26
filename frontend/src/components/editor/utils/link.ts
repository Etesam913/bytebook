import { Browser } from '@wailsio/runtime';
import { toast } from 'sonner';
import { DEFAULT_SONNER_OPTIONS } from '../../../utils/general';

const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

/** Opens the link in the browser when clicked */
export function handleATagClick(target: HTMLElement) {
  const parentElement = target.parentElement as HTMLLinkElement;
  if (parentElement.href.startsWith('wails://')) {
    return;
  }
  console.log(parentElement.href.toString());
  Browser.OpenURL(parentElement.href).catch(() => {
    toast.error(
      `Failed to open link: ${parentElement.href}`,
      DEFAULT_SONNER_OPTIONS
    );
  });
}

export const MATCHERS = [
  (text: string) => {
    const match = URL_MATCHER.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`,
      // attributes: { rel: 'noreferrer', target: '_blank' }, // Optional link attributes
    };
  },
];

const SUPPORTED_URL_PROTOCOLS = new Set([
  'http:',
  'https:',
  'mailto:',
  'sms:',
  'tel:',
  'wails:',
]);

/**
 * Sanitizes a URL by checking if it has a supported protocol.
 * If the URL has an unsupported protocol, returns 'about:blank'.
 * If the URL cannot be parsed, returns the original URL.
 * @param url The URL string to sanitize
 * @returns The sanitized URL string
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);

    if (!SUPPORTED_URL_PROTOCOLS.has(parsedUrl.protocol)) {
      return 'about:blank';
    }
  } catch {
    return url;
  }
  return url;
}
