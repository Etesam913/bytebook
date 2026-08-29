import { describe, expect, it } from 'bun:test';
import { buildFileTreeDragPayload } from './drag';

describe('buildFileTreeDragPayload', () => {
  it('encodes a file as a wails url', () => {
    const payload = buildFileTreeDragPayload(['My Notes/pic one.png']);

    expect(payload).toBe('wails:/notes/My%20Notes/pic%20one.png');
  });

  it('keeps the trailing slash on folders', () => {
    const payload = buildFileTreeDragPayload(['My Notes/']);

    expect(payload).toBe('wails:/notes/My%20Notes/');
  });

  it('joins several dragged items with commas', () => {
    const payload = buildFileTreeDragPayload(['a/note.md', 'b/']);

    expect(payload).toBe('wails:/notes/a/note.md,wails:/notes/b/');
  });

  it('skips paths that are neither a valid file nor folder', () => {
    const payload = buildFileTreeDragPayload(['Makefile', 'a/note.md']);

    expect(payload).toBe('wails:/notes/a/note.md');
  });
});
