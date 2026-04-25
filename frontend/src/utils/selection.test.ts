import '../test/setup';
import { describe, it, expect } from 'bun:test';
import {
  createSelectionKey,
  getSelectionValue,
  keepSelectionWithPrefix,
  addSelectionKeysWithSinglePrefix,
  getKeyForSidebarSelection,
  FILE_SELECTION_PREFIX,
  type SelectableItem,
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

describe('addSelectionKeysWithSinglePrefix', () => {
  it('returns prevState unchanged when no keys are added', () => {
    const prev = {
      selections: new Set(['file:1']),
      anchorSelection: 'file:1',
    };
    expect(
      addSelectionKeysWithSinglePrefix({
        prevState: prev,
        selectionKeysToAdd: [],
      })
    ).toBe(prev);
  });

  it('adds keys when prevState is empty', () => {
    const result = addSelectionKeysWithSinglePrefix({
      prevState: { selections: new Set(), anchorSelection: null },
      selectionKeysToAdd: ['file:1', 'file:2'],
    });
    expect(result.selections).toEqual(new Set(['file:1', 'file:2']));
  });

  it('unions new keys with existing ones when prefixes match', () => {
    const result = addSelectionKeysWithSinglePrefix({
      prevState: {
        selections: new Set(['file:1']),
        anchorSelection: 'file:1',
      },
      selectionKeysToAdd: ['file:2', 'file:3'],
    });
    expect(result.selections).toEqual(new Set(['file:1', 'file:2', 'file:3']));
  });

  it('replaces existing selections when the new prefix differs', () => {
    const result = addSelectionKeysWithSinglePrefix({
      prevState: {
        selections: new Set(['file:1', 'file:2']),
        anchorSelection: 'file:1',
      },
      selectionKeysToAdd: ['tag:Python'],
    });
    expect(result.selections).toEqual(new Set(['tag:Python']));
  });

  it('preserves the existing anchor when anchorSelectionKey is undefined', () => {
    const result = addSelectionKeysWithSinglePrefix({
      prevState: {
        selections: new Set(['file:1']),
        anchorSelection: 'file:1',
      },
      selectionKeysToAdd: ['file:2'],
    });
    expect(result.anchorSelection).toBe('file:1');
  });

  it('updates the anchor when a string is passed', () => {
    const result = addSelectionKeysWithSinglePrefix({
      prevState: {
        selections: new Set(['file:1']),
        anchorSelection: 'file:1',
      },
      selectionKeysToAdd: ['file:2'],
      anchorSelectionKey: 'file:2',
    });
    expect(result.anchorSelection).toBe('file:2');
  });

  it('clears the anchor when null is passed', () => {
    const result = addSelectionKeysWithSinglePrefix({
      prevState: {
        selections: new Set(['file:1']),
        anchorSelection: 'file:1',
      },
      selectionKeysToAdd: ['file:2'],
      anchorSelectionKey: null,
    });
    expect(result.anchorSelection).toBeNull();
  });
});

describe('getKeyForSidebarSelection', () => {
  it('builds a key with the file prefix from the item id', () => {
    const item = { id: 'abc' } as SelectableItem;
    expect(getKeyForSidebarSelection(item)).toBe('file:abc');
  });

  it('uses the FILE_SELECTION_PREFIX constant', () => {
    expect(FILE_SELECTION_PREFIX).toBe('file');
    const item = { id: 'note.md' } as SelectableItem;
    expect(getKeyForSidebarSelection(item)).toBe(
      `${FILE_SELECTION_PREFIX}:note.md`
    );
  });
});
