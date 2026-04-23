import '../test/setup';
import { describe, it, expect } from 'bun:test';
import {
  safeDecodeURIComponent,
  splitPathSegments,
  replaceLastPathSegment,
  createFilePath,
  createFolderPath,
} from './path';

describe('safeDecodeURIComponent', () => {
  it('decodes a valid percent-encoded string', () => {
    expect(safeDecodeURIComponent('hello%20world')).toBe('hello world');
    expect(safeDecodeURIComponent('foo%2Fbar')).toBe('foo/bar');
  });

  it('returns the input unchanged when no percent-encoding is present', () => {
    expect(safeDecodeURIComponent('plain text')).toBe('plain text');
  });

  it('falls back to the input when decoding throws (invalid percent sequence)', () => {
    expect(safeDecodeURIComponent('50%')).toBe('50%');
    expect(safeDecodeURIComponent('%')).toBe('%');
    expect(safeDecodeURIComponent('100%off')).toBe('100%off');
  });

  it('handles empty string', () => {
    expect(safeDecodeURIComponent('')).toBe('');
  });
});

describe('splitPathSegments', () => {
  it('splits a simple path into segments', () => {
    expect(splitPathSegments('notes/folder/file.md')).toEqual([
      'notes',
      'folder',
      'file.md',
    ]);
  });

  it('collapses consecutive slashes', () => {
    expect(splitPathSegments('notes//folder///file.md')).toEqual([
      'notes',
      'folder',
      'file.md',
    ]);
  });

  it('drops leading and trailing slashes', () => {
    expect(splitPathSegments('/notes/folder/')).toEqual(['notes', 'folder']);
  });

  it('returns an empty array for an empty string', () => {
    expect(splitPathSegments('')).toEqual([]);
  });

  it('returns an empty array for a path that is only slashes', () => {
    expect(splitPathSegments('///')).toEqual([]);
  });
});

describe('replaceLastPathSegment', () => {
  it('replaces the last segment of a multi-segment path', () => {
    expect(replaceLastPathSegment('notes/folder/old.md', 'new.md')).toBe(
      'notes/folder/new.md'
    );
  });

  it('replaces a single-segment path', () => {
    expect(replaceLastPathSegment('old.md', 'new.md')).toBe('new.md');
  });

  it('preserves a leading empty segment for absolute-style paths', () => {
    expect(replaceLastPathSegment('/notes/old.md', 'new.md')).toBe(
      '/notes/new.md'
    );
  });

  it('replaces the last segment when the path has a trailing slash', () => {
    expect(replaceLastPathSegment('notes/folder/', 'new-folder')).toBe(
      'notes/folder/new-folder'
    );
  });
});

describe('createFilePath', () => {
  it('parses a typical nested file path', () => {
    const fp = createFilePath('foo/bar/note.md');
    expect(fp).not.toBeNull();
    expect(fp).toMatchObject({
      type: 'file',
      fullPath: 'foo/bar/note.md',
      folder: 'foo/bar',
      note: 'note.md',
      extension: 'md',
      noteWithoutExtension: 'note',
      fileUrl: '/notes/foo/bar/note.md',
      encodedPath: 'foo/bar/note.md',
      encodedFileUrl: '/notes/foo/bar/note.md',
    });
  });

  it('parses a top-level file with no folder', () => {
    const fp = createFilePath('note.md');
    expect(fp).toMatchObject({
      type: 'file',
      fullPath: 'note.md',
      folder: '',
      note: 'note.md',
      extension: 'md',
      noteWithoutExtension: 'note',
      fileUrl: '/notes/note.md',
    });
  });

  it('normalizes repeated and surrounding slashes', () => {
    const fp = createFilePath('//foo//bar//note.md//');
    expect(fp?.fullPath).toBe('foo/bar/note.md');
    expect(fp?.folder).toBe('foo/bar');
  });

  it('lowercases the extension', () => {
    expect(createFilePath('foo/note.MD')?.extension).toBe('md');
    expect(createFilePath('foo/IMG.PNG')?.extension).toBe('png');
  });

  it('uses the last dot to split note name and extension', () => {
    const fp = createFilePath('archive.tar.gz');
    expect(fp?.extension).toBe('gz');
    expect(fp?.noteWithoutExtension).toBe('archive.tar');
  });

  it('URL-encodes each path segment', () => {
    const fp = createFilePath('my folder/some note.md');
    expect(fp?.encodedPath).toBe('my%20folder/some%20note.md');
    expect(fp?.encodedFileUrl).toBe('/notes/my%20folder/some%20note.md');
    // fullPath stays unencoded.
    expect(fp?.fullPath).toBe('my folder/some note.md');
  });

  it('returns null when the last segment has no extension', () => {
    expect(createFilePath('foo/bar')).toBeNull();
    expect(createFilePath('justaname')).toBeNull();
  });

  it('returns null for an empty or slash-only path', () => {
    expect(createFilePath('')).toBeNull();
    expect(createFilePath('/')).toBeNull();
    expect(createFilePath('///')).toBeNull();
  });

  it('returns null when the extension is empty (trailing dot)', () => {
    expect(createFilePath('foo/note.')).toBeNull();
  });

  it('equals() compares by fullPath', () => {
    const a = createFilePath('foo/bar/note.md')!;
    const b = createFilePath('//foo//bar//note.md/')!;
    const c = createFilePath('foo/bar/other.md')!;
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describe('createFolderPath', () => {
  it('parses a typical nested folder path', () => {
    const fp = createFolderPath('foo/bar');
    expect(fp).toMatchObject({
      type: 'folder',
      fullPath: 'foo/bar',
      folder: 'bar',
      folderUrl: '/notes/foo/bar',
      encodedPath: 'foo/bar',
      encodedFolderUrl: '/notes/foo/bar',
    });
  });

  it('strips trailing slashes', () => {
    expect(createFolderPath('foo/bar/')?.fullPath).toBe('foo/bar');
    expect(createFolderPath('foo/bar///')?.fullPath).toBe('foo/bar');
  });

  it('parses a top-level folder', () => {
    const fp = createFolderPath('bar');
    expect(fp?.folder).toBe('bar');
    expect(fp?.fullPath).toBe('bar');
  });

  it('URL-encodes each segment', () => {
    const fp = createFolderPath('my folder/sub folder');
    expect(fp?.encodedPath).toBe('my%20folder/sub%20folder');
    expect(fp?.encodedFolderUrl).toBe('/notes/my%20folder/sub%20folder');
    expect(fp?.fullPath).toBe('my folder/sub folder');
  });

  it('returns null for empty or slash-only input', () => {
    expect(createFolderPath('')).toBeNull();
    expect(createFolderPath('/')).toBeNull();
    expect(createFolderPath('///')).toBeNull();
  });

  it('returns null when the last segment looks like a file (contains a dot)', () => {
    expect(createFolderPath('foo/bar.md')).toBeNull();
    expect(createFolderPath('note.txt')).toBeNull();
  });

  it('equals() compares by fullPath', () => {
    const a = createFolderPath('foo/bar')!;
    const b = createFolderPath('foo/bar/')!;
    const c = createFolderPath('foo/baz')!;
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
