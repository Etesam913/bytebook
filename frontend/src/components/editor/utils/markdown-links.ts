/*
 * Checks if the given URL is an internal link.
 * An internal link is considered to be a URL that starts with "wails:".
 *
 * Returns true if the URL is an internal link, false otherwise.
 */
export function isInternalLink(url: string) {
  return url.startsWith('wails:');
}

/*
 * Escapes both single and double quotes in a string.
 * Returns a new string with all quotes escaped
 * Example:
 * escapeQuotes(`He said, "It's fine."`); // returns 'He said, \\"It\\'s fine.\\"'
 */
export function escapeQuotes(str: string): string {
  return str.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

/* Reverses `escapeQuotes`. */
export function unescapeQuotes(str: string): string {
  return str.replace(/\\(["'])/g, '$1');
}

/*
 * Encodes a URL for use in a Markdown link, handling special characters.
 * Returns the encoded URL with parentheses escaped
 * Example:
 * encodeLinkUrl('https://example.com/path(test)'); // returns encoded URL with escaped parentheses
 */
export function encodeLinkUrl(url: string): string {
  return encodeURIComponent(url).replace(/\(/g, '%28').replace(/\)/g, '%29');
}

/*
 * Encodes alt text for use in a Markdown link by replacing square brackets with %30 and %31.
 * Returns the text with [ replaced by %30 and ] replaced by %31
 * Example:
 * encodeLinkAltText('foo[bar]'); // returns 'foo%30bar%31'
 */
export function encodeLinkAltText(text: string): string {
  return text.replace(/\[/g, '%30').replace(/\]/g, '%31');
}

/*
 * Decodes alt text that was encoded with encodeLinkAltText.
 * Returns the text with %30 replaced by [ and %31 replaced by ]
 * Example:
 * decodeLinkAltText('foo%30bar%31'); // returns 'foo[bar]'
 */
export function decodeLinkAltText(encodedText: string): string {
  return encodedText.replace(/%30/g, '[').replace(/%31/g, ']');
}

/*
 * Escape special Markdown characters in file content so it can be used
 * inside [text](url) without breaking the link.
 * Returns the escaped file content
 * Example:
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

/*
 * Unescapes underscores in a string that were escaped for Markdown usage.
 * Returns the string with \_ replaced by _
 * Example:
 * unescapeUnderscore('foo\\_bar'); // returns 'foo_bar'
 */
export function unescapeUnderscore(input: string): string {
  return input.replace(/\\_/g, '_');
}

/*
 * Unescape a Markdown-escaped file content back to its original form.
 * Returns the unescaped file content
 * Example:
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
