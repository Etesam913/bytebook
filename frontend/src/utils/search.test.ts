import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import { addAncestorDirectoryPaths, queryHasFilterSyntax } from './search';

describe('queryHasFilterSyntax', () => {
  it('detects filter prefixes, tags, links, quotes, negation, and operators', () => {
    expect(queryHasFilterSyntax('#recipe')).toBe(true);
    expect(queryHasFilterSyntax('f:foo')).toBe(true);
    expect(queryHasFilterSyntax('type:note pasta')).toBe(true);
    expect(queryHasFilterSyntax('lang:python')).toBe(true);
    expect(queryHasFilterSyntax('sort:updated')).toBe(true);
    expect(queryHasFilterSyntax('"exact phrase"')).toBe(true);
    expect(queryHasFilterSyntax('-draft')).toBe(true);
    expect(queryHasFilterSyntax('a AND b')).toBe(true);
    expect(queryHasFilterSyntax('a || b')).toBe(true);
    expect(queryHasFilterSyntax('@links/target.md')).toBe(true);
    expect(queryHasFilterSyntax('pasta #recipe')).toBe(true);
  });

  it('treats plain text as a local substring filter', () => {
    expect(queryHasFilterSyntax('')).toBe(false);
    expect(queryHasFilterSyntax('pasta')).toBe(false);
    expect(queryHasFilterSyntax('fish and chips')).toBe(false);
    expect(queryHasFilterSyntax('meeting 12:30')).toBe(false);
    expect(queryHasFilterSyntax('email me@x')).toBe(false);
    expect(queryHasFilterSyntax('c#')).toBe(false);
    expect(queryHasFilterSyntax('-')).toBe(false);
    expect(queryHasFilterSyntax('notes-about-go')).toBe(false);
  });
});

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
