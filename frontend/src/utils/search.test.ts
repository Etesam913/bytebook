import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import { addAncestorDirectoryPaths } from './search';

describe('addAncestorDirectoryPaths', () => {
  it('adds ancestor directories with trailing slashes before each file', () => {
    expect(addAncestorDirectoryPaths(['a/b/c.md'])).toEqual([
      'a/',
      'a/b/',
      'a/b/c.md',
    ]);
  });

  it('dedupes shared ancestors across files', () => {
    expect(addAncestorDirectoryPaths(['a/one.md', 'a/b/two.md'])).toEqual([
      'a/',
      'a/one.md',
      'a/b/',
      'a/b/two.md',
    ]);
  });

  it('passes root-level files through unchanged', () => {
    expect(addAncestorDirectoryPaths(['root.md'])).toEqual(['root.md']);
  });

  it('returns an empty list for no input', () => {
    expect(addAncestorDirectoryPaths([])).toEqual([]);
  });
});
