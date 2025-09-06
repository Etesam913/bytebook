import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FILE_SERVER_URL } from './general';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fileNameRegex = /^[0-9a-zA-Z_\-. ]+$/;

export type FilePathAdditionalQueryParams = {
  highlight: string;
};

/**
 * Utility class for converting and extracting information from note paths.
 *
 * @example
 * // Example usage:
 * const converter = new FilePath({ folder: "docs", note: "readme.md" });
 * console.log(filePath.folder); // "docs"
 * console.log(filePath.note); // "readme.md"
 * console.log(filePath.noteWithoutExtension); // "readme"
 * console.log(filePath.noteExtension); // "md"
 * console.log(filePath.noteWithExtensionParam); // "readme?ext=md"
 */
export class FilePath {
  readonly folder: string;
  readonly note: string;
  readonly noteWithoutExtension: string;
  readonly noteExtension: string;
  readonly noteWithExtensionParam: string;

  constructor({ folder, note }: { folder: string; note: string }) {
    this.folder = folder;
    this.note = note;
    const noteExtension = this.getExtensionFromNote(note);
    if (!noteExtension) {
      throw new Error(`Note must have an extension: ${note}`);
    }
    this.noteWithoutExtension = this.getNoteWithoutExtension(note);
    this.noteExtension = noteExtension;
    this.noteWithExtensionParam = `${this.noteWithoutExtension}?ext=${this.noteExtension}`;
  }

  /**
   * Returns the note name without its extension.
   * @param note - The note file name (e.g., "readme.md").
   * @returns The note name without extension (e.g., "readme").
   */
  private getNoteWithoutExtension(note: string): string {
    const lastDotIndex = note.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return note;
    }
    return note.substring(0, lastDotIndex);
  }

  /**
   * Returns the extension of the note file.
   * @param note - The note file name (e.g., "readme.md").
   * @returns The extension (e.g., "md"), or null if none found.
   */
  private getExtensionFromNote(note: string): string | null {
    const lastDotIndex = note.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return null;
    }
    return note.substring(lastDotIndex + 1);
  }

  /**
   * Checks if the current FilePath is equal to another FilePath.
   * @param other - The other FilePath to compare with.
   * @returns true if the two FilePaths are equal, false otherwise.
   */
  equals(other: FilePath) {
    return this.folder === other.folder && this.note === other.note;
  }

  toString() {
    return `${this.folder}/${this.note}`;
  }

  /**
   * Returns a link to the note, with optional additional query parameters.
   * @param extraParams - An object of additional query parameters to add to the link.
   * @returns The link to the note with query parameters.
   */
  getLinkToNote(extraParams?: FilePathAdditionalQueryParams) {
    const params = new URLSearchParams({ ext: this.noteExtension });
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, String(value));
      }
    }
    return `/${this.folder}/${encodeURIComponent(this.noteWithoutExtension)}?${params.toString()}`;
  }

  getFileUrl() {
    return `${FILE_SERVER_URL}/notes/${this.folder}/${this.note}`;
  }
}

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
 * @param noteNameWithQueryParams - The input string containing the note name and query parameters.
 * @returns An object with the base name and query parameters.
 */
export function extractInfoFromNoteName(noteNameWithQueryParams: string) {
  // Create a URL object to parse the noteName string.
  // The base URL ("http://example.com") is used to properly parse relative URLs.
  const url = new URL(
    encodeNoteNameWithQueryParams(noteNameWithQueryParams),
    'http://example.com'
  );

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
 * Converts a note name with query parameters to dot notation format.
 *
 * @param noteNameWithQueryParams - The note name with query parameters (e.g., "abc?ext=md")
 * @returns The note name in dot notation format (e.g., "abc.md")
 *
 * @example
 * convertNoteNameWithQueryParamsToDotNotation("abc?ext=md") // returns "abc.md"
 * convertNoteNameWithQueryParamsToDotNotation("my-note?ext=txt") // returns "my-note.txt"
 */
export function convertNoteNameToDotNotation(
  noteNameWithQueryParams: string
): string {
  const { noteNameWithoutExtension, queryParams } = extractInfoFromNoteName(
    noteNameWithQueryParams
  );

  // If there's an ext query parameter, combine with dot notation
  if (queryParams.ext) {
    return `${noteNameWithoutExtension}.${queryParams.ext}`;
  }

  // If no extension query parameter, return just the note name
  return noteNameWithoutExtension;
}

/**
 * Converts a file path with dot notation to query parameter format.
 *
 * @param filePath - The file path with extension (e.g., "folderName/noteName.md")
 * @returns The file path with query parameter format (e.g., "folderName/noteName?ext=md")
 *
 * @example
 * convertFilePathToQueryNotation("folderName/noteName.md") // returns "folderName/noteName?ext=md"
 * convertFilePathToQueryNotation("docs/readme.txt") // returns "docs/readme?ext=txt"
 * convertFilePathToQueryNotation("noextension") // returns "noextension"
 */
export function convertFilePathToQueryNotation(filePath: string): string {
  // Find the last dot in the file path
  const lastDotIndex = filePath.lastIndexOf('.');
  const lastSlashIndex = filePath.lastIndexOf('/');

  // If no dot found, or dot is before the last slash (part of folder name), return original
  if (lastDotIndex === -1 || lastSlashIndex > lastDotIndex) {
    return filePath;
  }

  // Split into base path and extension
  const basePath = filePath.substring(0, lastDotIndex);
  const extension = filePath.substring(lastDotIndex + 1);

  // Return in query parameter format
  return `${basePath}?ext=${extension}`;
}

/**
 * Encodes the note name and query params
 * ex: "abc??ext=md" encodes the abc? part"
 * @param noteNameWithQueryParams
 * @returns
 */
export function encodeNoteNameWithQueryParams(noteNameWithQueryParams: string) {
  const splitByExtension = noteNameWithQueryParams.split('?ext=');
  // If there is no extension, return the original note name
  if (splitByExtension.length === 1) {
    return encodeURIComponent(noteNameWithQueryParams);
  }
  const encodedNoteName = encodeURIComponent(
    splitByExtension.slice(0, -1).join()
  );
  return `${encodedNoteName}?ext=${splitByExtension[splitByExtension.length - 1]}`;
}

/**
 * Gets the file extension of a URL if it points to a file like a pdf
 * It deals with query parameters as well. This is for the CONTROLLED_TEXT_INSERTION event
 */
export function getFileExtension(encodedURL: string) {
  // Extract the part before the query parameters
  const baseUrl = encodedURL.split('?')[0];

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
 * Converts a selection range value directly to dot notation format.
 * This is a helper that combines prefix removal and dot notation conversion.
 *
 * @param selectionRangeValue - The selection range value (e.g., "note:abc?ext=md")
 * @returns The note name in dot notation format (e.g., "abc.md")
 */
export function convertSelectionRangeValueToDotNotation(
  selectionRangeValue: string
): string {
  const noteWithoutPrefix = selectionRangeValue.split(':')[1];
  return convertNoteNameToDotNotation(noteWithoutPrefix);
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
 * Escapes both single and double quotes in a string.
 * @param str The input string
 * @returns A new string with all quotes escaped
 * @example
 * escapeQuotes(`He said, "It's fine."`); // returns 'He said, \\"It\\'s fine.\\"'
 */
export function escapeQuotes(str: string): string {
  return str.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

/**
 * Removes escape characters from quotes in a string.
 * @param str The input string with escaped quotes
 * @returns A new string with escape characters removed from quotes
 * @example
 * unescapeQuotes('He said, \\"It\\'s fine.\\"'); // returns 'He said, "It's fine."'
 */
export function unescapeQuotes(str: string): string {
  return str.replace(/\\"/g, '"').replace(/\\'/g, "'");
}

/**
 * Converts escaped newline characters (\\n) back to actual newline characters (\n)
 * @param str The input string with escaped newlines
 * @returns A new string with escaped newlines converted to actual newlines
 * @example
 * unescapeNewlines('Line1\\nLine2'); // returns 'Line1\nLine2'
 */
export function unescapeNewlines(str: string): string {
  return str.replace(/\\n/g, '\n');
}

/**
 * Escape special Markdown characters in file content so it can be used
 * inside [text](url) without breaking the link.
 * @param content The file content to escape
 * @returns The escaped file content
 * @example
 * escapeFileContentForMarkdown('file[name](test)'); // returns 'file\\[name\\]\\(test\\)'
 */
export function escapeFileContentForMarkdown(content: string): string {
  // Matches any of: \ [ ] ( )
  return content.replace(/([\\[\]()])/g, '\\$1');
}

/**
 * Unescape a Markdown-escaped file content back to its original form.
 * @param escaped The escaped file content
 * @returns The unescaped file content
 * @example
 * unescapeFileContentFromMarkdown('file\\[name\\]\\(test\\)'); // returns 'file[name](test)'
 */
export function unescapeFileContentFromMarkdown(escaped: string): string {
  // Matches a backslash followed by one of: \ [ ] ( )
  return escaped.replace(/\\([\\[\]()])/g, '$1');
}
