import { describe, expect, it } from 'bun:test';
import {
  buildFileTreeDragPayload,
  excludeActiveItemFromDrag,
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

describe('excludeActiveItemFromDrag', () => {
  it('drops the active item when other items are dragged with it', () => {
    const paths = excludeActiveItemFromDrag(
      ['a/open.md', 'a/one.md', 'b/'],
      'a/open.md'
    );

    expect(paths).toEqual(['a/one.md', 'b/']);
  });

  it('keeps the active item when it is the only dragged item', () => {
    const paths = excludeActiveItemFromDrag(['a/open.md'], 'a/open.md');

    expect(paths).toEqual(['a/open.md']);
  });

  it('leaves the paths alone when nothing is active', () => {
    const paths = excludeActiveItemFromDrag(['a/one.md', 'b/'], null);

    expect(paths).toEqual(['a/one.md', 'b/']);
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
