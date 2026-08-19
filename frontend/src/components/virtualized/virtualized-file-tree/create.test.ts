import { describe, expect, it } from 'bun:test';
import { FILE_TYPE, FOLDER_TYPE } from '../../../utils/tree-item-types';
import { getPlaceholderPath } from './create';

function hasItemFrom(paths: readonly string[]) {
  return (path: string) => paths.includes(path);
}

describe('getPlaceholderPath', () => {
  it('returns the first free name for a note', () => {
    const hasItem = hasItemFrom(['docs/Existing.md']);

    const result = getPlaceholderPath({
      parentPath: 'docs/',
      itemType: FILE_TYPE,
      hasItem,
    });

    expect(result).toBe('docs/Untitled');
  });

  it('returns a trailing-slash path for a folder', () => {
    const hasItem = hasItemFrom([]);

    const result = getPlaceholderPath({
      parentPath: 'docs/',
      itemType: FOLDER_TYPE,
      hasItem,
    });

    expect(result).toBe('docs/Untitled/');
  });

  it.each([
    { taken: ['docs/Untitled'], label: 'a bare Untitled node' },
    { taken: ['docs/Untitled.md'], label: 'an Untitled.md note' },
    { taken: ['docs/Untitled/'], label: 'an Untitled directory' },
  ])('skips to Untitled 2 for a note when $label exists', ({ taken }) => {
    const result = getPlaceholderPath({
      parentPath: 'docs/',
      itemType: FILE_TYPE,
      hasItem: hasItemFrom(taken),
    });

    expect(result).toBe('docs/Untitled 2');
  });

  it('skips a folder placeholder past both file and directory collisions', () => {
    const hasItem = hasItemFrom(['docs/Untitled/', 'docs/Untitled 2']);

    const result = getPlaceholderPath({
      parentPath: 'docs/',
      itemType: FOLDER_TYPE,
      hasItem,
    });

    expect(result).toBe('docs/Untitled 3/');
  });

  it('increments until a free suffix is found', () => {
    const hasItem = hasItemFrom([
      'docs/Untitled',
      'docs/Untitled 2.md',
      'docs/Untitled 3/',
    ]);

    const result = getPlaceholderPath({
      parentPath: 'docs/',
      itemType: FILE_TYPE,
      hasItem,
    });

    expect(result).toBe('docs/Untitled 4');
  });
});
