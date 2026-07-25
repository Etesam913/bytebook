import '../../../../test/setup';
import { describe, expect, it } from 'bun:test';
import {
  canSelectionMoveToDropTarget,
  hasLoadedChildren,
  isFileTreeIndexVisible,
} from './file-tree-utils';
import {
  FILE_TYPE,
  FOLDER_TYPE,
  type FileOrFolder,
  type Folder,
} from '../types';

const fileOrFolderMap = new Map<string, FileOrFolder>([
  [
    'folder-a',
    {
      id: 'folder-a',
      type: FOLDER_TYPE,
      name: 'Folder A',
      path: 'Folder A',
      parentId: null,
      childrenIds: ['note-a-1', 'note-a-2'],
      childrenCursor: null,
      hasMoreChildren: false,
      childrenLoaded: true,
      isOpen: true,
    },
  ],
  [
    'folder-b',
    {
      id: 'folder-b',
      type: FOLDER_TYPE,
      name: 'Folder B',
      path: 'Folder B',
      parentId: null,
      childrenIds: ['note-b-1'],
      childrenCursor: null,
      hasMoreChildren: false,
      childrenLoaded: true,
      isOpen: true,
    },
  ],
  [
    'note-a-1',
    {
      id: 'note-a-1',
      type: FILE_TYPE,
      name: 'Note A1.md',
      path: 'Folder A/Note A1.md',
      parentId: 'folder-a',
    },
  ],
  [
    'note-a-2',
    {
      id: 'note-a-2',
      type: FILE_TYPE,
      name: 'Note A2.md',
      path: 'Folder A/Note A2.md',
      parentId: 'folder-a',
    },
  ],
  [
    'note-b-1',
    {
      id: 'note-b-1',
      type: FILE_TYPE,
      name: 'Note B1.md',
      path: 'Folder B/Note B1.md',
      parentId: 'folder-b',
    },
  ],
]);

describe('canSelectionMoveToDropTarget', () => {
  it('rejects a folder drop when every selected item is already a direct child', () => {
    expect(
      canSelectionMoveToDropTarget({
        fileOrFolderMap,
        selectionKeys: new Set(['file:note-a-1', 'file:note-a-2']),
        dropTargetId: 'folder-a',
      })
    ).toBe(false);
  });

  it('allows a folder drop when at least one selected item would move', () => {
    expect(
      canSelectionMoveToDropTarget({
        fileOrFolderMap,
        selectionKeys: new Set(['file:note-a-1', 'file:note-b-1']),
        dropTargetId: 'folder-a',
      })
    ).toBe(true);
  });

  it('rejects a file-row drop when every selected item is already in that file parent', () => {
    expect(
      canSelectionMoveToDropTarget({
        fileOrFolderMap,
        selectionKeys: new Set(['file:note-a-1']),
        dropTargetId: 'note-a-2',
      })
    ).toBe(false);
  });
});

describe('hasLoadedChildren', () => {
  const emptyFolder: Folder = {
    id: 'empty-folder',
    type: FOLDER_TYPE,
    name: 'Empty',
    path: 'Empty',
    parentId: null,
    childrenIds: [],
    childrenCursor: null,
    hasMoreChildren: false,
    childrenLoaded: false,
    isOpen: false,
  };

  it('distinguishes an unfetched folder from a fetched empty folder', () => {
    expect(hasLoadedChildren(emptyFolder)).toBe(false);
    expect(hasLoadedChildren({ ...emptyFolder, childrenLoaded: true })).toBe(
      true
    );
  });
});

describe('isFileTreeIndexVisible', () => {
  const visibleRange = { startIndex: 3, endIndex: 7 };

  it('includes both visible range boundaries', () => {
    expect(isFileTreeIndexVisible(3, visibleRange)).toBe(true);
    expect(isFileTreeIndexVisible(7, visibleRange)).toBe(true);
  });

  it('rejects indexes outside the visible range', () => {
    expect(isFileTreeIndexVisible(2, visibleRange)).toBe(false);
    expect(isFileTreeIndexVisible(8, visibleRange)).toBe(false);
    expect(isFileTreeIndexVisible(-1, visibleRange)).toBe(false);
  });
});
