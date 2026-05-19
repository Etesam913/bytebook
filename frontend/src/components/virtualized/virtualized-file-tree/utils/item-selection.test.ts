import '../../../../test/setup';
import { describe, expect, it } from 'bun:test';
import { computeShiftClickSelections } from './item-selection';
import {
  CREATE_FOLDER_TYPE,
  FILE_TYPE,
  FOLDER_TYPE,
  LOAD_MORE_TYPE,
  type FlattenedFileOrFolder,
  type VirtualizedFileTreeItem,
} from '../types';

describe('computeShiftClickSelections', () => {
  it('selects the visible flattened range including open folder descendants', () => {
    const virtualizedData: VirtualizedFileTreeItem[] = [
      { id: 'create-folder', type: CREATE_FOLDER_TYPE, level: 0 },
      {
        id: 'note-a',
        type: FILE_TYPE,
        name: 'Note A',
        path: 'Note A.md',
        parentId: null,
        level: 0,
      },
      {
        id: 'folder-b',
        type: FOLDER_TYPE,
        name: 'Folder B',
        path: 'Folder B',
        parentId: null,
        childrenIds: ['note-b-1', 'note-b-2'],
        childrenCursor: null,
        hasMoreChildren: false,
        isOpen: true,
        level: 0,
      },
      {
        id: 'note-b-1',
        type: FILE_TYPE,
        name: 'Note B1',
        path: 'Folder B/Note B1.md',
        parentId: 'folder-b',
        level: 1,
      },
      {
        id: 'note-b-2',
        type: FILE_TYPE,
        name: 'Note B2',
        path: 'Folder B/Note B2.md',
        parentId: 'folder-b',
        level: 1,
      },
      {
        id: 'note-c',
        type: FILE_TYPE,
        name: 'Note C',
        path: 'Note C.md',
        parentId: null,
        level: 0,
      },
    ];

    const result = computeShiftClickSelections({
      virtualizedData,
      dataItem: virtualizedData[5] as FlattenedFileOrFolder,
      anchorSelectionKey: 'file:note-a',
    });

    expect(result?.selections).toEqual(
      new Set([
        'file:note-a',
        'file:folder-b',
        'file:note-b-1',
        'file:note-b-2',
        'file:note-c',
      ])
    );
  });

  it('skips non-selectable rows in the visible range', () => {
    const virtualizedData: VirtualizedFileTreeItem[] = [
      {
        id: 'folder-a',
        type: FOLDER_TYPE,
        name: 'Folder A',
        path: 'Folder A',
        parentId: null,
        childrenIds: ['note-a'],
        childrenCursor: 'next',
        hasMoreChildren: true,
        isOpen: true,
        level: 0,
      },
      {
        id: 'load-more-folder-a',
        type: LOAD_MORE_TYPE,
        parentId: 'folder-a',
        name: 'Load more...',
        level: 1,
      },
      {
        id: 'note-b',
        type: FILE_TYPE,
        name: 'Note B',
        path: 'Note B.md',
        parentId: null,
        level: 0,
      },
    ];

    const result = computeShiftClickSelections({
      virtualizedData,
      dataItem: virtualizedData[2] as FlattenedFileOrFolder,
      anchorSelectionKey: 'file:folder-a',
    });

    expect(result?.selections).toEqual(
      new Set(['file:folder-a', 'file:note-b'])
    );
  });
});
