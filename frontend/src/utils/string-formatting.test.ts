import '../test/setup';
import { describe, it, expect } from 'bun:test';
import {
  cn,
  getQueryParamValue,
  addQueryParam,
  removeQueryParam,
  isInternalLink,
  getTagNameFromSelectionRange,
  parseRGB,
  getContentTypeAndValueFromSelectionRangeValue,
  flattenHtml,
  escapeQuotes,
  unescapeQuotes,
  unescapeNewlines,
  encodeLinkUrl,
  encodeLinkAltText,
  decodeLinkAltText,
  escapeFileContentForMarkdown,
  unescapeFileContentFromMarkdown,
  unescapeUnderscore,
  formatDate,
} from './string-formatting';

describe('cn', () => {
  it('merges conflicting tailwind classes, keeping the last one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('accepts arrays, objects, and falsy values via clsx', () => {
    expect(cn('a', false, ['b'], { c: true, d: false })).toBe('a b c');
  });

  it('returns an empty string for no inputs', () => {
    expect(cn()).toBe('');
  });
});

describe('getQueryParamValue', () => {
  it('returns the value of a present query param', () => {
    expect(getQueryParamValue('https://example.com/x?foo=bar', 'foo')).toBe(
      'bar'
    );
  });

  it('returns null for a missing query param', () => {
    expect(
      getQueryParamValue('https://example.com/x?foo=bar', 'baz')
    ).toBeNull();
  });

  it('returns null when the URL has no query string', () => {
    expect(getQueryParamValue('https://example.com/x', 'foo')).toBeNull();
  });

  it('handles multiple params correctly', () => {
    const url = 'https://example.com/x?a=1&b=2&c=3';
    expect(getQueryParamValue(url, 'a')).toBe('1');
    expect(getQueryParamValue(url, 'b')).toBe('2');
    expect(getQueryParamValue(url, 'c')).toBe('3');
  });
});

describe('addQueryParam', () => {
  it('appends a new query string when none exists', () => {
    expect(addQueryParam('https://example.com/x', 'foo', 'bar')).toBe(
      'https://example.com/x?foo=bar'
    );
  });

  it('updates an existing key in place', () => {
    expect(addQueryParam('https://example.com/x?foo=old', 'foo', 'new')).toBe(
      'https://example.com/x?foo=new'
    );
  });

  it('appends a new key while preserving other params', () => {
    expect(addQueryParam('https://example.com/x?a=1', 'b', '2')).toBe(
      'https://example.com/x?a=1&b=2'
    );
  });
});

describe('removeQueryParam', () => {
  it('removes the target key while keeping other params', () => {
    expect(removeQueryParam('https://example.com/x?a=1&b=2', 'a')).toBe(
      'https://example.com/x?b=2'
    );
  });

  it('drops the leading "?" when the last param is removed', () => {
    expect(removeQueryParam('https://example.com/x?foo=bar', 'foo')).toBe(
      'https://example.com/x'
    );
  });

  it('is a no-op when the URL has no query string', () => {
    expect(removeQueryParam('https://example.com/x', 'foo')).toBe(
      'https://example.com/x'
    );
  });

  it('is a no-op when the key is absent', () => {
    expect(removeQueryParam('https://example.com/x?a=1', 'b')).toBe(
      'https://example.com/x?a=1'
    );
  });
});

describe('isInternalLink', () => {
  it('returns true for wails: URLs', () => {
    expect(isInternalLink('wails:foo')).toBe(true);
    expect(isInternalLink('wails://host/path')).toBe(true);
  });

  it('returns false for external URLs', () => {
    expect(isInternalLink('https://example.com')).toBe(false);
    expect(isInternalLink('http://example.com')).toBe(false);
    expect(isInternalLink('mailto:a@b.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isInternalLink('')).toBe(false);
  });
});

describe('getTagNameFromSelectionRange', () => {
  it('extracts the tag name after "tag:"', () => {
    expect(getTagNameFromSelectionRange('tag:Python')).toBe('Python');
  });

  it('returns input unchanged when no "tag:" prefix exists', () => {
    expect(getTagNameFromSelectionRange('Python')).toBe('Python');
  });

  it('returns empty string for empty input', () => {
    expect(getTagNameFromSelectionRange('')).toBe('');
  });

  it('extracts whatever follows "tag:" when prefix is embedded', () => {
    // Current behavior: indexOf finds first occurrence.
    expect(getTagNameFromSelectionRange('foo tag:bar')).toBe('bar');
  });
});

describe('parseRGB', () => {
  it('parses an rgb() string', () => {
    expect(parseRGB('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('parses an rgba() string', () => {
    expect(parseRGB('rgba(10,20,30,0.5)')).toEqual({
      r: 10,
      g: 20,
      b: 30,
      a: 0.5,
    });
  });

  it('tolerates arbitrary whitespace', () => {
    expect(parseRGB('rgb( 1 , 2 , 3 )')).toEqual({ r: 1, g: 2, b: 3 });
  });

  it('is case-insensitive', () => {
    expect(parseRGB('RGB(0,0,0)')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('returns null for invalid strings', () => {
    expect(parseRGB('not a color')).toBeNull();
    expect(parseRGB('hsl(0, 0%, 0%)')).toBeNull();
    expect(parseRGB('')).toBeNull();
  });
});

describe('getContentTypeAndValueFromSelectionRangeValue', () => {
  it('parses a simple "type:value" string', () => {
    expect(
      getContentTypeAndValueFromSelectionRangeValue('note:Chapter1.md')
    ).toEqual({ contentType: 'note', value: 'Chapter1.md' });
  });

  it('parses each valid SidebarContentType', () => {
    expect(
      getContentTypeAndValueFromSelectionRangeValue('saved-search:foo')
    ).toEqual({ contentType: 'saved-search', value: 'foo' });
    expect(
      getContentTypeAndValueFromSelectionRangeValue('pinned-note:n.md')
    ).toEqual({ contentType: 'pinned-note', value: 'n.md' });
    expect(
      getContentTypeAndValueFromSelectionRangeValue('kernel:python')
    ).toEqual({ contentType: 'kernel', value: 'python' });
  });

  it('throws when the prefix is not a valid SidebarContentType', () => {
    expect(() =>
      getContentTypeAndValueFromSelectionRangeValue('bogus:value')
    ).toThrow(/Invalid sidebar content type/);
  });

  it('throws on multi-colon input where joined prefix is invalid', () => {
    // Joins all but last segment with ':' as the type — so 'tag:a:b' becomes type='tag:a' (invalid).
    expect(() =>
      getContentTypeAndValueFromSelectionRangeValue('tag:a:b')
    ).toThrow(/Invalid sidebar content type/);
  });
});

describe('flattenHtml', () => {
  it('replaces real newlines with the two-char escape "\\n"', () => {
    expect(flattenHtml('a\nb\nc')).toBe('a\\nb\\nc');
  });

  it('trims leading and trailing whitespace', () => {
    expect(flattenHtml('  hello  ')).toBe('hello');
  });

  it('is idempotent on already-flattened input', () => {
    expect(flattenHtml('a\\nb')).toBe('a\\nb');
  });
});

describe('escapeQuotes / unescapeQuotes', () => {
  it('escapeQuotes prepends backslashes to single and double quotes', () => {
    expect(escapeQuotes(`a"b'c`)).toBe(`a\\"b\\'c`);
  });

  it('unescapeQuotes removes backslashes from quotes', () => {
    expect(unescapeQuotes(`a\\"b\\'c`)).toBe(`a"b'c`);
  });

  it('round-trips arbitrary quoted content', () => {
    const input = `He said, "It's fine."`;
    expect(unescapeQuotes(escapeQuotes(input))).toBe(input);
  });
});

describe('unescapeNewlines', () => {
  it('replaces escaped newline sequences with real newlines', () => {
    expect(unescapeNewlines('Line1\\nLine2')).toBe('Line1\nLine2');
  });

  it('is a no-op when no escaped newlines are present', () => {
    expect(unescapeNewlines('no newlines here')).toBe('no newlines here');
  });
});

describe('encodeLinkUrl', () => {
  it('URL-encodes and escapes parentheses', () => {
    expect(encodeLinkUrl('https://example.com/path(test)')).toBe(
      'https%3A%2F%2Fexample.com%2Fpath%28test%29'
    );
  });

  it('escapes both opening and closing parens explicitly', () => {
    expect(encodeLinkUrl('(')).toBe('%28');
    expect(encodeLinkUrl(')')).toBe('%29');
  });
});

describe('encodeLinkAltText / decodeLinkAltText', () => {
  it('encodes square brackets to %30 and %31', () => {
    expect(encodeLinkAltText('foo[bar]')).toBe('foo%30bar%31');
  });

  it('decodes %30 and %31 back to square brackets', () => {
    expect(decodeLinkAltText('foo%30bar%31')).toBe('foo[bar]');
  });

  it('round-trips arbitrary text', () => {
    const input = 'a [nested [list]] item';
    expect(decodeLinkAltText(encodeLinkAltText(input))).toBe(input);
  });

  it('leaves other characters untouched', () => {
    expect(encodeLinkAltText('plain text')).toBe('plain text');
  });
});

describe('escapeFileContentForMarkdown / unescapeFileContentFromMarkdown', () => {
  it('escapes backslashes, brackets, and parens', () => {
    expect(escapeFileContentForMarkdown('file[name](test)')).toBe(
      'file%30name%31\\(test\\)'
    );
  });

  it('escapes a literal backslash before other transforms', () => {
    // Source string is 3 chars: 'a', backslash, 'b'.
    expect(escapeFileContentForMarkdown('a\\b')).toBe('a\\\\b');
  });

  it('round-trips arbitrary content', () => {
    const inputs = [
      'file[name](test)',
      'a\\b',
      'mixed [a](b) \\ () []',
      'plain text',
      '',
    ];
    for (const input of inputs) {
      expect(
        unescapeFileContentFromMarkdown(escapeFileContentForMarkdown(input))
      ).toBe(input);
    }
  });
});

describe('unescapeUnderscore', () => {
  it('replaces escaped underscores with plain underscores', () => {
    expect(unescapeUnderscore('foo\\_bar')).toBe('foo_bar');
  });

  it('leaves non-escaped underscores untouched', () => {
    expect(unescapeUnderscore('foo_bar')).toBe('foo_bar');
  });
});

describe('formatDate', () => {
  describe('yyyy-mm-dd format', () => {
    it('returns the ISO date portion', () => {
      expect(formatDate('2024-01-15T12:34:56Z', 'yyyy-mm-dd')).toBe(
        '2024-01-15'
      );
    });

    it('handles dates at midnight UTC', () => {
      expect(formatDate('2024-12-31T00:00:00Z', 'yyyy-mm-dd')).toBe(
        '2024-12-31'
      );
    });
  });

  describe('relative format', () => {
    // Build ISO strings relative to "now" so the assertion holds without mocking Date.
    const secondsAgo = (s: number) =>
      new Date(Date.now() - s * 1000).toISOString();

    it('returns "just now" for under a minute', () => {
      expect(formatDate(secondsAgo(30), 'relative')).toBe('just now');
    });

    it('returns singular "1 minute ago" for ~90 seconds', () => {
      expect(formatDate(secondsAgo(90), 'relative')).toBe('1 minute ago');
    });

    it('returns plural "X minutes ago" for under an hour', () => {
      expect(formatDate(secondsAgo(330), 'relative')).toBe('5 minutes ago');
    });

    it('returns singular "1 hour ago" for ~75 minutes', () => {
      expect(formatDate(secondsAgo(75 * 60), 'relative')).toBe('1 hour ago');
    });

    it('returns plural "X hours ago" for several hours', () => {
      expect(formatDate(secondsAgo(3.5 * 60 * 60), 'relative')).toBe(
        '3 hours ago'
      );
    });

    it('returns singular "1 day ago" for ~36 hours', () => {
      expect(formatDate(secondsAgo(36 * 60 * 60), 'relative')).toBe(
        '1 day ago'
      );
    });

    it('returns plural "X days ago" for several days', () => {
      expect(formatDate(secondsAgo(4 * 24 * 60 * 60), 'relative')).toBe(
        '4 days ago'
      );
    });

    it('falls back to a locale date string for >= 7 days', () => {
      const result = formatDate(secondsAgo(14 * 24 * 60 * 60), 'relative');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Should not be one of the relative phrases.
      expect(result).not.toMatch(/ ago$/);
      expect(result).not.toBe('just now');
    });
  });
});
