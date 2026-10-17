import '../../../../test/setup';
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { FileTree } from '@pierre/trees';
import {
  restoreSelectionAfterDrag,
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
    const payload = buildFileTreeDragPayload(['a/note.', 'a/note.md']);

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

describe('restoreSelectionAfterDrag', () => {
  const models: FileTree[] = [];
  afterEach(() => {
    for (const model of models) model.cleanUp();
    models.length = 0;
  });

  it.each(['route.md', 'folder/'])(
    'restores selection to %s without changing focus or scrolling',
    (target) => {
      const model = new FileTree({
        paths: ['route.md', 'folder/', 'dragged.md'],
      });
      models.push(model);
      model.getItem('dragged.md')!.select();
      model.focusPath('dragged.md');
      const scroll = spyOn(model, 'scrollToPath');

      restoreSelectionAfterDrag(model, target);

      expect(model.getSelectedPaths()).toEqual([target]);
      expect(model.getFocusedPath()).toBe('dragged.md');
      expect(scroll).not.toHaveBeenCalled();
      scroll.mockRestore();
    }
  );

  it.each([null, 'missing.md'])(
    'clears selection when the route target is %s',
    (target) => {
      const model = new FileTree({ paths: ['one.md', 'two.md'] });
      models.push(model);
      model.getItem('one.md')!.select();
      model.getItem('two.md')!.select();

      restoreSelectionAfterDrag(model, target);

      expect(model.getSelectedPaths()).toEqual([]);
    }
  );

  it('preserves a selected route target while deselecting dragged items', () => {
    const model = new FileTree({ paths: ['route.md', 'dragged.md'] });
    models.push(model);
    model.getItem('route.md')!.select();
    model.getItem('dragged.md')!.select();

    restoreSelectionAfterDrag(model, 'route.md');

    expect(model.getSelectedPaths()).toEqual(['route.md']);
  });
});
