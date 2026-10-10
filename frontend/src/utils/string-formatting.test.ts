import '@/test/setup';
import { describe, it, expect } from 'bun:test';
import {
  cn,
  getTagNameFromSelectionRange,
  parseRGB,
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
