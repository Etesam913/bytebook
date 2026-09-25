import { describe, expect, it } from 'bun:test';
import {
  buildFileTreeDragPayload,
  getRootDropKind,
  getTreeItemName,
} from './drag';

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

describe('getTreeItemName', () => {
  it('returns the last segment of a file path', () => {
    expect(getTreeItemName('My Notes/pic one.png')).toBe('pic one.png');
  });

  it('ignores the trailing slash on folders', () => {
    expect(getTreeItemName('My Notes/sub/')).toBe('sub');
  });
});

describe('getRootDropKind', () => {
  const scroll = document.createElement('div');
  scroll.dataset.fileTreeVirtualizedScroll = 'true';

  function rowPath(attrs: Record<string, string>) {
    const row = document.createElement('button');
    row.dataset.type = 'item';
    Object.assign(row.dataset, attrs);
    return [document.createElement('span'), row, scroll, document.body];
  }

  it('treats blank space in the scroll container as a background drop', () => {
    expect(getRootDropKind([scroll, document.body])).toBe('background');
  });

  it('treats a top-level file row as a root drop', () => {
    expect(
      getRootDropKind(rowPath({ itemType: 'file', itemParentPath: '' }))
    ).toBe('top-level-row');
  });

  it('ignores nested files and folders', () => {
    expect(
      getRootDropKind(rowPath({ itemType: 'file', itemParentPath: 'a/' }))
    ).toBeNull();
    expect(getRootDropKind(rowPath({ itemType: 'folder' }))).toBeNull();
  });

  it('ignores elements outside the tree', () => {
    expect(getRootDropKind([document.body])).toBeNull();
  });
});
