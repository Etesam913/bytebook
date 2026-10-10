import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merges Tailwind CSS class names, resolving conflicts via tailwind-merge.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const NAME_CHARS = /^[^<>:"/\\|?*]+$/;

// Extracts the tag name from a selection range string in "tag:tagName" format.
// Will be in tag:tagName format
export function getTagNameFromSelectionRange(tagSetValue: string) {
  const indexOfPrefix = tagSetValue.indexOf('tag:');
  if (indexOfPrefix === -1) {
    return tagSetValue;
  }
  const prefixLength = 'tag:'.length;
  return tagSetValue.substring(indexOfPrefix + prefixLength);
}

type RGB = { r: number; g: number; b: number };
type RGBA = { r: number; g: number; b: number; a: number };

/**
 * Parses an RGB or RGBA color string and returns its components.
 * @param colorString - The RGB(A) color string to parse.
 * @returns An object with r, g, b, and optionally a properties, or null if parsing fails.
 */
export function parseRGB(colorString: string): RGB | RGBA | null {
  // Remove all spaces for easier matching
  const sanitizedString = colorString.replace(/\s+/g, '');

  // Regular expression to match rgb() and rgba() strings
  const rgbRegex = /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/i;
  const rgbaRegex = /^rgba\((\d{1,3}),(\d{1,3}),(\d{1,3}),([01]?\.?\d*)\)$/i;

  let match = rgbRegex.exec(sanitizedString);
  if (match) {
    const [, r, g, b] = match;
    return {
      r: Number(r),
      g: Number(g),
      b: Number(b),
    };
  }

  match = rgbaRegex.exec(sanitizedString);
  if (match) {
    const [, r, g, b, a] = match;
    return {
      r: Number(r),
      g: Number(g),
      b: Number(b),
      a: Number(a),
    };
  }

  // Return null if the string doesn't match the expected format
  return null;
}
