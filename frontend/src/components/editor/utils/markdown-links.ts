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
 * Encodes a URL for use in a Markdown link, handling special characters.
 * @param url The URL to encode
 * @returns The encoded URL with parentheses escaped
 * @example
 * encodeLinkUrl('https://example.com/path(test)'); // returns encoded URL with escaped parentheses
 */
export function encodeLinkUrl(url: string): string {
  return encodeURIComponent(url).replace(/\(/g, '%28').replace(/\)/g, '%29');
}

/**
 * Encodes alt text for use in a Markdown link by replacing square brackets with %30 and %31.
 * @param text The alt text to encode
 * @returns The text with [ replaced by %30 and ] replaced by %31
 * @example
 * encodeLinkAltText('foo[bar]'); // returns 'foo%30bar%31'
 */
export function encodeLinkAltText(text: string): string {
  return text.replace(/\[/g, '%30').replace(/\]/g, '%31');
}

/**
 * Decodes alt text that was encoded with encodeLinkAltText.
 * @param encodedText The encoded alt text
 * @returns The text with %30 replaced by [ and %31 replaced by ]
 * @example
 * decodeLinkAltText('foo%30bar%31'); // returns 'foo[bar]'
 */
export function decodeLinkAltText(encodedText: string): string {
  return encodedText.replace(/%30/g, '[').replace(/%31/g, ']');
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
  // Escape all special markdown characters: \ [ ] ( )
  // Escape backslashes first
  let escaped = content.replace(/\\/g, '\\\\');
  // Escape square brackets
  escaped = encodeLinkAltText(escaped);
  // Escape parentheses
  escaped = escaped.replace(/([()])/g, '\\$1');
  return escaped;
}

/**
 * Unescapes underscores in a string that were escaped for Markdown usage.
 * @param input The string to unescape
 * @returns The string with \_ replaced by _
 * @example
 * unescapeUnderscore('foo\\_bar'); // returns 'foo_bar'
 */
export function unescapeUnderscore(input: string): string {
  return input.replace(/\\_/g, '_');
}

/**
 * Unescape a Markdown-escaped file content back to its original form.
 * @param escaped The escaped file content
 * @returns The unescaped file content
 * @example
 * unescapeFileContentFromMarkdown('file\\[name\\]\\(test\\)'); // returns 'file[name](test)'
 */
export function unescapeFileContentFromMarkdown(escaped: string): string {
  // Unescape backslashes first
  let unescaped = escaped.replace(/\\\\/g, '\\');
  // Unescape square brackets
  unescaped = decodeLinkAltText(unescaped);
  // Unescape parentheses
  unescaped = unescaped.replace(/\\([()])/g, '$1');
  return unescaped;
}
