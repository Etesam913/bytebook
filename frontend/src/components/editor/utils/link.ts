import { createLinkMatcherWithRegExp } from '@lexical/link';
import { Browser } from '@wailsio/runtime';
import { toast } from 'sonner';
import { DEFAULT_SONNER_OPTIONS } from '@utils/general';

/** Opens an external link in the system browser. */
export function openLinkInBrowser(href: string) {
  Browser.OpenURL(href).catch(() => {
    toast.error(`Failed to open link: ${href}`, DEFAULT_SONNER_OPTIONS);
  });
}

const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

/** Matchers for AutoLinkPlugin; bare `www.` links get an https scheme. */
export const LINK_MATCHERS = [
  createLinkMatcherWithRegExp(URL_MATCHER, (text) =>
    text.startsWith('http') ? text : `https://${text}`
  ),
];
