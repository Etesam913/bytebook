import { describe, expect, it } from 'bun:test';
import {
  isPointInsideElement,
  parseFileTreeDropPayload,
  resolveFolderDrop,
} from './drop';

function fakeDataTransfer(text: string): DataTransfer {
  return { getData: () => text } as unknown as DataTransfer;
}

describe('parseFileTreeDropPayload', () => {
  it('decodes a single file url into a tree path', () => {
    expect(
      parseFileTreeDropPayload('wails:/notes/My%20Notes/pic%20one.png')
    ).toEqual(['My Notes/pic one.png']);
  });

  it('keeps the trailing slash that marks folders', () => {
    expect(parseFileTreeDropPayload('wails:/notes/My%20Notes/')).toEqual([
      'My Notes/',
    ]);
  });

  it('splits comma-joined multi-selections', () => {
    expect(
      parseFileTreeDropPayload('wails:/notes/a/note.md, wails:/notes/b/')
    ).toEqual(['a/note.md', 'b/']);
  });

  it('ignores entries that are not wails urls', () => {
    expect(
      parseFileTreeDropPayload('https://example.com,wails:/notes/a/note.md')
    ).toEqual(['a/note.md']);
  });

  it('returns nothing for empty or root-only payloads', () => {
    expect(parseFileTreeDropPayload('')).toEqual([]);
    expect(parseFileTreeDropPayload('wails:/notes/')).toEqual([]);
  });
});

describe('resolveFolderDrop', () => {
  it('moves the dragged tree items', () => {
    expect(
      resolveFolderDrop({
        dataTransfer: fakeDataTransfer(
          'wails:/notes/a/note.md,wails:/notes/b/'
        ),
        isFileTreeDrag: true,
      })
    ).toEqual({ type: 'move-tree-items', itemPaths: ['a/note.md', 'b/'] });
  });

  it('ignores drags that did not start in the file tree', () => {
    expect(
      resolveFolderDrop({
        dataTransfer: fakeDataTransfer('wails:/notes/a/note.md'),
        isFileTreeDrag: false,
      })
    ).toBeNull();
  });

  it('ignores drops without a data transfer or usable payload', () => {
    expect(
      resolveFolderDrop({ dataTransfer: null, isFileTreeDrag: true })
    ).toBeNull();
    expect(
      resolveFolderDrop({
        dataTransfer: fakeDataTransfer('some plain text'),
        isFileTreeDrag: true,
      })
    ).toBeNull();
  });
});

describe('isPointInsideElement', () => {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({ left: 10, top: 20, right: 110, bottom: 220 }) as DOMRect;

  it('is true for points within (and on) the bounds', () => {
    expect(isPointInsideElement({ element, x: 50, y: 100 })).toBe(true);
    expect(isPointInsideElement({ element, x: 10, y: 220 })).toBe(true);
  });

  it('is false for points outside the bounds', () => {
    expect(isPointInsideElement({ element, x: 9, y: 100 })).toBe(false);
    expect(isPointInsideElement({ element, x: 50, y: 221 })).toBe(false);
  });
});
