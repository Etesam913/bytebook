import '../../../../test/setup';
import { describe, expect, it } from 'bun:test';
import type { FileTreeData } from '../../../../atoms';
import { FOLDER_TYPE } from '../types';
import { applyInitialLoad } from './open-folder';

describe('applyInitialLoad', () => {
  it('marks an empty folder as loaded', () => {
    const maps: FileTreeData = {
      treeData: new Map([
        [
          'folder',
          {
            id: 'folder',
            type: FOLDER_TYPE,
            name: 'Folder',
            path: 'Folder',
            parentId: null,
            childrenIds: [],
            childrenCursor: null,
            hasMoreChildren: false,
            childrenLoaded: false,
            isOpen: true,
          },
        ],
      ]),
      filePathToTreeDataId: new Map([['Folder', 'folder']]),
    };

    applyInitialLoad({
      folderId: 'folder',
      items: [],
      hasMore: false,
      nextCursor: '',
      maps,
    });

    expect(maps.treeData.get('folder')).toMatchObject({
      childrenIds: [],
      childrenCursor: null,
      hasMoreChildren: false,
      childrenLoaded: true,
    });
  });
});
