import '@/test/setup';
import { describe, it, expect } from 'bun:test';
import {
  isInternalLink,
  escapeQuotes,
  encodeLinkUrl,
  encodeLinkAltText,
  decodeLinkAltText,
  escapeFileContentForMarkdown,
  unescapeUnderscore,
  unescapeFileContentFromMarkdown,
} from '@components/editor/utils/markdown-links';

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

describe('escapeQuotes', () => {
  it('escapeQuotes prepends backslashes to single and double quotes', () => {
    expect(escapeQuotes(`a"b'c`)).toBe(`a\\"b\\'c`);
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

  it.each([
    'file[name](test)',
    'a\\b',
    'mixed [a](b) \\ () []',
    'plain text',
    '',
  ])('round-trips %j', (input) => {
    expect(
      unescapeFileContentFromMarkdown(escapeFileContentForMarkdown(input))
    ).toBe(input);
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
