import '../../test/setup';
import { describe, it, expect } from 'bun:test';
import type { SearchResult } from '../../hooks/search';
import { createFilePath } from '../../utils/path';
import { dataItemToKey, dataItemToString } from './utils';

function makeNoteResult(path: string): SearchResult {
  return {
    type: 'note',
    filePath: createFilePath(path)!,
    tags: [],
    lastUpdated: '2025-01-01T00:00:00Z',
    created: '2025-01-01T00:00:00Z',
    highlights: [],
    codeContent: [],
  };
}

function makeAttachmentResult(path: string): SearchResult {
  return {
    type: 'attachment',
    filePath: createFilePath(path)!,
    tags: [],
  };
}

describe('dataItemToKey', () => {
  it('joins type and full path with a dash', () => {
    expect(dataItemToKey(makeNoteResult('foo/bar/note.md'))).toBe(
      'note-foo/bar/note.md'
    );
  });

  it('uses the attachment type for attachment results', () => {
    expect(dataItemToKey(makeAttachmentResult('files/img.png'))).toBe(
      'attachment-files/img.png'
    );
  });

  it('produces distinct keys for the same path with different types', () => {
    expect(dataItemToKey(makeNoteResult('foo/x.md'))).not.toBe(
      dataItemToKey(makeAttachmentResult('foo/x.md'))
    );
  });

  it('uses the normalized fullPath (collapses repeated slashes)', () => {
    expect(dataItemToKey(makeNoteResult('//foo//bar//note.md'))).toBe(
      'note-foo/bar/note.md'
    );
  });
});

describe('dataItemToString', () => {
  it('returns the note filename including extension', () => {
    expect(dataItemToString(makeNoteResult('foo/bar/note.md'))).toBe('note.md');
  });

  it('returns the attachment filename', () => {
    expect(dataItemToString(makeAttachmentResult('files/img.png'))).toBe(
      'img.png'
    );
  });

  it('returns just the note when the file is at the top level', () => {
    expect(dataItemToString(makeNoteResult('top.md'))).toBe('top.md');
  });
});
