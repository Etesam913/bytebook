import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fileNameRegex = /^[0-9a-zA-Z_\-. ]+$/;

/**
 * Retrieves the value of a specific query parameter from a given URL string.
 *
 * @param fullString - The full URL string.
 * @param queryParamName - The name of the query parameter to retrieve the value for.
 * @returns The value of the query parameter if found, otherwise null.
 */
export function getQueryParamValue(fullString: string, queryParamName: string) {
  // Match the query string part of the URL
  const queryParamMatch = fullString.match(/\?.*$/);
  if (queryParamMatch) {
    // Extract the query string without the leading '?'
    const queryString = queryParamMatch[0].substring(1);
    const params = new URLSearchParams(queryString);
    // Get the value of the specified query parameter
    return params.get(queryParamName);
  }
  return null;
}

/**
 * Adds or updates a query parameter in a given URL string.
 *
 * @param fullString - The full URL string.
 * @param queryParamName - The name of the query parameter to add or update.
 * @param queryParamValue - The value of the query parameter to set.
 * @returns The updated URL string with the new or updated query parameter.
 */
export function addQueryParam(
  fullString: string,
  queryParamName: string,
  queryParamValue: string
) {
  // Match the query string part of the URL
  const queryParamMatch = fullString.match(/\?.*$/);
  if (queryParamMatch) {
    // Extract the query string without the leading '?'
    const queryString = queryParamMatch[0].substring(1);
    const params = new URLSearchParams(queryString);
    // Set or update the specified query parameter
    params.set(queryParamName, queryParamValue);
    // Replace the old query string with the new one
    return fullString.replace(/\?.*$/, `?${params.toString()}`);
  }
  // If no query string exists, add the new query parameter
  return `${fullString}?${queryParamName}=${queryParamValue}`;
}

/**
 * Removes a specific query parameter from a given URL string.
 *
 * @param fullString - The full URL string.
 * @param queryParamName - The name of the query parameter to remove.
 * @returns The updated URL string with the query parameter removed.
 */
export function removeQueryParam(fullString: string, queryParamName: string) {
  // Match the query string part of the URL
  const queryParamMatch = fullString.match(/\?.*$/);
  if (queryParamMatch) {
    // Extract the query string without the leading '?'
    const queryString = queryParamMatch[0].substring(1);
    const params = new URLSearchParams(queryString);
    // Delete the specified query parameter
    params.delete(queryParamName);
    // Replace the old query string with the new one, handling the case where the query string is empty
    return fullString.replace(
      /\?.*$/,
      `${params.toString().length === 0 ? '' : '?'}${params.toString()}`
    );
  }
  // If no query string exists, return the original URL
  return fullString;
}

/**
 * Checks if the given URL is an internal link.
 * An internal link is considered to be a URL that starts with "wails:".
 *
 * @param url - The URL to check.
 * @returns true if the URL is an internal link, false otherwise.
 */
export function isInternalLink(url: string) {
  return url.startsWith('wails:');
}

/**
 * Determines the type of internal link based on the URL.
 * Decodes the URL, parses it, and checks the segments of the pathname.
 *
 * @param url - The URL to analyze.
 * @returns An object with two properties:
 *          isNoteLink - true if the URL points to a note, determined by having 2 segments in the pathname.
 *          isFolderLink - true if the URL points to a folder, determined by having 1 segment in the pathname.
 */
export function getInternalLinkType(url: string) {
  const urlObj = new URL(url);

  // Split the pathname into segments.
  const segments = urlObj.pathname.split('/');
  // Remove the first segment as it's always empty (due to leading slash).
  segments.shift();

  // Determine the type of link based on the number of segments.
  return {
    isNoteLink: segments.length === 2,
    isFolderLink: segments.length === 1,
  };
}

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const NAME_CHARS = /^[^<>:"/\\|?*]+$/;

/**
 * Validates name for create folder/note dialogs
 * @param name
 * @param nameType
 * @returns
 */
export function validateName(
  name: FormDataEntryValue | null,
  nameType: 'folder' | 'note'
): ValidationResult {
  if (!name) {
    return {
      isValid: false,
      errorMessage: `You cannot have an empty ${nameType} name`,
    };
  }

  const nameString = name.toString().trim();

  if (nameString.length === 0) {
    return {
      isValid: false,
      errorMessage: `You cannot have an empty ${nameType} name`,
    };
  }

  if (!NAME_CHARS.test(nameString)) {
    return {
      isValid: false,
      errorMessage: `Invalid ${nameType} name. Avoid special characters: <>:"/\\|?* and leading/trailing spaces.`,
    };
  }

  return {
    isValid: true,
  };
}
// Will be in tag:tagName format
export function getTagNameFromSetValue(tagSetValue: string) {
  const indexOfPrefix = tagSetValue.indexOf('tag:');
  if (indexOfPrefix === -1) {
    return tagSetValue;
  }
  const prefixLength = 'tag:'.length;
  return tagSetValue.substring(indexOfPrefix + prefixLength);
}

/**
 * Extracts the base name and query parameters from a given note name string.
 *
 * @param noteName - The input string containing the note name and query parameters.
 * @returns An object with the base name and query parameters.
 */
export function extractInfoFromNoteName(noteName: string) {
  // Create a URL object to parse the noteName string.
  // The base URL ("http://example.com") is used to properly parse relative URLs.
  const url = new URL(noteName, 'http://example.com');

  // Extract the pathname and remove the leading "/" to get the base name.
  const base = url.pathname.substring(1);

  // Initialize an empty object to store the query parameters.
  const queryParams: { [key: string]: string } = {};

  // Iterate over each search parameter and add it to the queryParams object.
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  // Return an object containing the decoded base name and query parameters.
  return {
    noteNameWithoutExtension: decodeURIComponent(base),
    queryParams: queryParams,
  };
}

/**
 * Gets the file extension of a URL if it points to a file like a pdf
 * It deals with query parameters as well. This is for the CONTROLLED_TEXT_INSERTION event
 */
export function getFileExtension(url: string) {
  // Extract the part before the query parameters
  const baseUrl = url.split('?')[0];

  // Find the last period in the baseUrl
  const lastDotIndex = baseUrl.lastIndexOf('.');
  const lastSlashIndex = baseUrl.lastIndexOf('/');
  // If no period is found, return null
  if (lastDotIndex === -1 || lastSlashIndex > lastDotIndex) {
    return { urlWithoutExtension: null, extension: null, fileName: null };
  }

  const urlWithoutExtension = baseUrl.substring(0, lastDotIndex);

  const fileName = baseUrl.substring(lastSlashIndex + 1, lastDotIndex);

  // Extract the extension
  const extension = baseUrl.substring(lastDotIndex + 1);

  // Return the extension if it's valid (length > 0)
  return {
    urlWithoutExtension,
    extension: extension.length > 0 ? extension : null,
    fileName,
  };
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

export function parseNoteNameFromSelectionRangeValue(
  selectionRangeValue: string
) {
  const noteWithoutWithoutPrefix = selectionRangeValue.split(':')[1];
  const { noteNameWithoutExtension, queryParams } = extractInfoFromNoteName(
    noteWithoutWithoutPrefix
  );

  return { noteNameWithoutExtension, queryParams };
}

/**
 * Flattens HTML by replacing newlines with escaped newlines and trimming whitespace.
 * @param html The HTML string to flatten
 * @returns A flattened string with newlines replaced by '\n' character sequences and trimmed
 */
export function flattenHtml(html: string): string {
  return html
    .replace(/\n/g, '\\n') // turn each real newline into two characters "\" + "n"
    .trim();
}

/**
 * Escapes both single and double quotes in a string
 * @param str The input string
 * @returns A new string with all quotes escaped
 */
export function escapeQuotes(str: string): string {
  return str.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

/**
 * Removes escape characters from quotes in a string
 * @param str The input string with escaped quotes
 * @returns A new string with escape characters removed from quotes
 */
export function unescapeQuotes(str: string): string {
  return str.replace(/\\"/g, '"').replace(/\\'/g, "'");
}

/**
 * Converts escaped newline characters (\\n) back to actual newline characters (\n)
 * @param str The input string with escaped newlines
 * @returns A new string with escaped newlines converted to actual newlines
 */
export function unescapeNewlines(str: string): string {
  return str.replace(/\\n/g, '\n');
}

/**
 * Escape special Markdown characters in file content so it can be used
 * inside [text](url) without breaking the link.
 */
export function escapeFileContentForMarkdown(content: string): string {
  // Matches any of: \ [ ] ( )
  return content.replace(/([\\[\]()])/g, '\\$1');
}

/**
 * Unescape a Markdown-escaped file content back to its original form.
 */
export function unescapeFileContentFromMarkdown(escaped: string): string {
  // Matches a backslash followed by one of: \ [ ] ( )
  return escaped.replace(/\\([\\[\]()])/g, '$1');
}
