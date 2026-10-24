import '@/test/setup';
import { describe, it, expect } from 'bun:test';
import {
  createSelectionKey,
  getSelectionRange,
  keepSelectionWithPrefix,
  toggleSelection,
} from './selection';

describe('getSelectionRange', () => {
  it.each([
    {
      name: 'follows displayed order',
      anchor: 'z.md',
      target: 'm.md',
      expected: ['z.md', 'a.md', 'm.md'],
    },
    {
      name: 'selects a reverse range',
      anchor: 'm.md',
      target: 'z.md',
      expected: ['z.md', 'a.md', 'm.md'],
    },
    {
      name: 'selects a single item at the anchor',
      anchor: 'a.md',
      target: 'a.md',
      expected: ['a.md'],
    },
    {
      name: 'falls back when the anchor is missing',
      anchor: 'missing.md',
      target: 'a.md',
      expected: ['a.md'],
    },
    {
      name: 'falls back when there is no anchor',
      anchor: null,
      target: 'a.md',
      expected: ['a.md'],
    },
    {
      name: 'falls back when the target is missing',
      anchor: 'z.md',
      target: 'missing.md',
      expected: ['missing.md'],
    },
  ])('$name', ({ anchor, target, expected }) => {
    const items = ['z.md', 'a.md', 'm.md'];

    const result = getSelectionRange({ items, anchor, target });

    expect(result).toEqual([...expected]);
    expect(items).toEqual(['z.md', 'a.md', 'm.md']);
  });
});

describe('toggleSelection', () => {
  it.each([
    {
      name: 'adds an unselected item',
      target: 'file:b.md',
      expected: ['file:a.md', 'file:b.md'],
    },
    { name: 'removes a selected item', target: 'file:a.md', expected: [] },
  ])('$name without mutating the selection', ({ target, expected }) => {
    const selected = new Set(['file:a.md']);

    const result = toggleSelection(selected, target);

    expect(result).toEqual(new Set(expected));
    expect(selected).toEqual(new Set(['file:a.md']));
  });
});

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
