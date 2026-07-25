import '../../../../test/setup';
import { describe, expect, it } from 'bun:test';
import type { FileTreeData } from '../../../../atoms';
import { FILE_TYPE, FOLDER_TYPE } from '../types';
import { cloneFileTreeData, removeSubtree } from './file-tree-state';

describe('file tree state operations', () => {
  it('clones both indexes and removes a complete loaded subtree', () => {
    const original: FileTreeData = {
      treeData: new Map([
        [
          'folder',
          {
            id: 'folder',
            type: FOLDER_TYPE,
            name: 'Folder',
            path: 'Folder',
            parentId: null,
            childrenIds: ['nested-folder'],
            childrenCursor: null,
            hasMoreChildren: false,
            childrenLoaded: true,
            isOpen: true,
          },
        ],
        [
          'nested-folder',
          {
            id: 'nested-folder',
            type: FOLDER_TYPE,
            name: 'Nested',
            path: 'Folder/Nested',
            parentId: 'folder',
            childrenIds: ['note'],
            childrenCursor: null,
            hasMoreChildren: false,
            childrenLoaded: true,
            isOpen: true,
          },
        ],
        [
          'note',
          {
            id: 'note',
            type: FILE_TYPE,
            name: 'Note.md',
            path: 'Folder/Nested/Note.md',
            parentId: 'nested-folder',
          },
        ],
      ]),
      filePathToTreeDataId: new Map([
        ['Folder', 'folder'],
        ['Folder/Nested', 'nested-folder'],
        ['Folder/Nested/Note.md', 'note'],
      ]),
    };

    const next = cloneFileTreeData(original);
    const removedIds = new Set<string>();
    removeSubtree(next, 'folder', removedIds);

    expect(next.treeData.size).toBe(0);
    expect(next.filePathToTreeDataId.size).toBe(0);
    expect(removedIds).toEqual(new Set(['note', 'nested-folder', 'folder']));
    expect(original.treeData.size).toBe(3);
    expect(original.filePathToTreeDataId.size).toBe(3);
  });
});
