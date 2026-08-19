import '@/test/setup';
import { describe, it, expect } from 'bun:test';
import {
  createSelectionKey,
  getSelectionValue,
  keepSelectionWithPrefix,
} from './selection';

describe('createSelectionKey', () => {
  it('joins prefix and value with a colon separator', () => {
    expect(createSelectionKey('file', '123')).toBe('file:123');
    expect(createSelectionKey('tag', 'Python')).toBe('tag:Python');
    expect(createSelectionKey('saved-search', 'foo')).toBe('saved-search:foo');
  });

  it('handles empty value', () => {
    expect(createSelectionKey('file', '')).toBe('file:');
  });
});

describe('getSelectionValue', () => {
  it('returns the part after the first colon', () => {
    expect(getSelectionValue('tag:Python')).toBe('Python');
    expect(getSelectionValue('file:abc/def.md')).toBe('abc/def.md');
  });

  it('returns the joined remainder when value contains a colon', () => {
    // Splits on the first colon only.
    expect(getSelectionValue('a:b:c')).toBe('b:c');
  });

  it('returns null when there is no separator', () => {
    expect(getSelectionValue('no-colon')).toBeNull();
    expect(getSelectionValue('')).toBeNull();
  });

  it('returns null when the separator is the final character', () => {
    expect(getSelectionValue('tag:')).toBeNull();
  });
});

describe('keepSelectionWithPrefix', () => {
  it('keeps only items with the given prefix', () => {
    const input = new Set(['file:1', 'tag:x', 'file:2', 'kernel:py']);
    expect(keepSelectionWithPrefix(input, 'file')).toEqual(
      new Set(['file:1', 'file:2'])
    );
  });

  it('returns an empty set when nothing matches', () => {
    const input = new Set(['tag:x', 'kernel:py']);
    expect(keepSelectionWithPrefix(input, 'file')).toEqual(new Set());
  });

  it('returns an empty set when input is empty', () => {
    expect(keepSelectionWithPrefix(new Set(), 'file')).toEqual(new Set());
  });

  it('requires the colon separator after the prefix (no false positive on similar prefixes)', () => {
    const input = new Set(['file:1', 'filed:2', 'file']);
    expect(keepSelectionWithPrefix(input, 'file')).toEqual(new Set(['file:1']));
  });

  it('produces a new Set instead of mutating the input', () => {
    const input = new Set(['file:1', 'tag:x']);
    const output = keepSelectionWithPrefix(input, 'file');
    expect(output).not.toBe(input);
    expect(input.size).toBe(2);
  });
});
