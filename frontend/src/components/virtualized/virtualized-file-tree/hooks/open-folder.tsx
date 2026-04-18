import { useMutation } from '@tanstack/react-query';
import { GetChildrenOfFolderBasedOnLimit } from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import type { FileOrFolder as BackendFileOrFolder } from '../../../../../bindings/github.com/etesam913/bytebook/internal/notes/models';
import type { FileTreeData } from '../../../../atoms';
import { QueryError } from '../../../../utils/query';
import { fileTreeDataAtom } from '../../../../atoms';
import type { FileOrFolder } from '../types';
import { FILE_TYPE, FOLDER_TYPE } from '../types';
import { isTreeNodeAFolder } from '../utils/file-tree-utils';
import type { SetStateAction } from 'jotai';
import { useSetAtom, useStore } from 'jotai';
import { Dispatch, useRef } from 'react';

type TreeMaps = {
  treeData: Map<string, FileOrFolder>;
  filePathToTreeDataId: Map<string, string>;
};

/** Inserts a backend entry into the tree and path maps. */
function insertEntry(
  entry: BackendFileOrFolder,
  parentId: string,
  maps: TreeMaps
) {
  maps.filePathToTreeDataId.set(entry.path, entry.id);

  const commonAttributes = {
    id: entry.id,
    path: entry.path,
    name: entry.name,
    parentId,
  };

  switch (entry.type) {
    case FILE_TYPE:
      maps.treeData.set(entry.id, {
        ...commonAttributes,
        type: 'file',
      });
      break;
    case FOLDER_TYPE:
      maps.treeData.set(entry.id, {
        ...commonAttributes,
        type: 'folder',
        childrenIds: entry.childrenIds,
        childrenCursor: null,
        hasMoreChildren: false,
        isOpen: false,
      });
      break;
  }
}

/** Updates the parent folder node with new children metadata. */
function updateParentFolder(
  folderId: string,
  childrenIds: string[],
  hasMore: boolean,
  nextCursor: string,
  maps: TreeMaps
) {
  const folder = maps.treeData.get(folderId);
  if (folder && isTreeNodeAFolder(folder)) {
    maps.treeData.set(folderId, {
      ...folder,
      childrenIds,
      hasMoreChildren: hasMore,
      childrenCursor: hasMore ? nextCursor : null,
    });
  }
}

/** Handles the "load more" case: appends new children to existing childrenIds. */
export function applyLoadMore({
  folderId,
  items,
  hasMore,
  nextCursor,
  maps,
}: {
  folderId: string;
  items: BackendFileOrFolder[];
  hasMore: boolean;
  nextCursor: string;
  maps: TreeMaps;
}) {
  const existingFolder = maps.treeData.get(folderId);
  const childrenIds: string[] =
    existingFolder && isTreeNodeAFolder(existingFolder)
      ? [...existingFolder.childrenIds]
      : [];

  for (const entry of items) {
    // Deduplicate by path: if an item with this path already exists, use the existing ID
    const existingId = maps.filePathToTreeDataId.get(entry.path);
    if (existingId) {
      if (!childrenIds.includes(existingId)) {
        childrenIds.push(existingId);
      }
    } else {
      childrenIds.push(entry.id);
      insertEntry(entry, folderId, maps);
    }
  }

  updateParentFolder(folderId, childrenIds, hasMore, nextCursor, maps);
}

/** Removes stale children (and their descendants) that are no longer in the response. */
function removeStaleChildren(
  folderId: string,
  returnedPaths: Set<string>,
  maps: TreeMaps
) {
  const existingFolder = maps.treeData.get(folderId);
  if (!existingFolder || !isTreeNodeAFolder(existingFolder)) return;

  for (const childId of existingFolder.childrenIds) {
    const childNode = maps.treeData.get(childId);
    if (!childNode || returnedPaths.has(childNode.path)) continue;

    for (const [path, id] of maps.filePathToTreeDataId.entries()) {
      if (path === childNode.path || path.startsWith(childNode.path + '/')) {
        maps.filePathToTreeDataId.delete(path);
        maps.treeData.delete(id);
      }
    }
  }
}

/** Handles the initial load: reconciles existing children with newly fetched ones. */
export function applyInitialLoad({
  folderId,
  items,
  hasMore,
  nextCursor,
  maps,
}: {
  folderId: string;
  items: BackendFileOrFolder[];
  hasMore: boolean;
  nextCursor: string;
  maps: TreeMaps;
}) {
  const returnedPaths = new Set(items.map((entry) => entry.path));

  // Remove children from parent that are no longer in the response
  removeStaleChildren(folderId, returnedPaths, maps);

  const reconciledChildrenIds: string[] = [];
  for (const entry of items) {
    const existingId = maps.filePathToTreeDataId.get(entry.path);
    if (existingId) {
      reconciledChildrenIds.push(existingId);
    } else {
      reconciledChildrenIds.push(entry.id);
      insertEntry(entry, folderId, maps);
    }
  }

  updateParentFolder(
    folderId,
    reconciledChildrenIds,
    hasMore,
    nextCursor,
    maps
  );
}

/** Explicitly sets isOpen on a folder node without fetching children. */
export function setFolderOpen({
  setFileTreeData,
  folderId,
  isOpen,
}: {
  setFileTreeData: Dispatch<SetStateAction<FileTreeData>>;
  folderId: string;
  isOpen: boolean;
}) {
  setFileTreeData((prev) => {
    const folder = prev.treeData.get(folderId);
    if (!folder || !isTreeNodeAFolder(folder)) return prev;
    const newTreeData = new Map(prev.treeData);
    newTreeData.set(folderId, { ...folder, isOpen });
    return { ...prev, treeData: newTreeData };
  });
}

/**
 * Custom hook to fetch children of a folder from the backend.
 *
 * This mutation only fetches and stores children data — it does NOT
 * change the folder's `isOpen` state. Use `setFolderOpen` separately
 * to control sidebar expansion.
 *
 * @param options.pageSize - Number of children to fetch per request (default: 300).
 * @returns A mutation object for fetching folder children.
 */
export function useFetchFolderChildrenMutation(options?: {
  pageSize?: number;
}) {
  const store = useStore();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const pageSize = options?.pageSize ?? 300;
  const inFlightFolders = useRef(new Set<string>());

  return useMutation({
    mutationFn: async ({
      pathToFolder,
      folderId,
      isLoadMore,
    }: {
      pathToFolder: string;
      folderId: string;
      isLoadMore?: boolean;
    }) => {
      // Skip if a fetch for this folder is already in flight
      if (inFlightFolders.current.has(folderId)) return;
      inFlightFolders.current.add(folderId);

      try {
        const { treeData } = store.get(fileTreeDataAtom);
        const folderData = treeData.get(folderId);
        if (!folderData || !isTreeNodeAFolder(folderData)) {
          throw new QueryError('Folder not found');
        }

        const cursorToUse = isLoadMore ? (folderData.childrenCursor ?? '') : '';
        const res = await GetChildrenOfFolderBasedOnLimit(
          pathToFolder,
          folderId,
          cursorToUse,
          pageSize
        );
        if (!res.success || (!res.data && res.message)) {
          throw new QueryError(res.message);
        }

        setFileTreeData((prev: FileTreeData) => {
          if (!res.data) return prev;

          const maps: TreeMaps = {
            treeData: new Map(prev.treeData),
            filePathToTreeDataId: new Map(prev.filePathToTreeDataId),
          };
          const items = res.data.items ?? [];

          if (isLoadMore) {
            applyLoadMore({
              folderId,
              items,
              hasMore: res.data.hasMore,
              nextCursor: res.data.nextCursor,
              maps,
            });
          } else {
            applyInitialLoad({
              folderId,
              items,
              hasMore: res.data.hasMore,
              nextCursor: res.data.nextCursor,
              maps,
            });
          }

          return maps;
        });
      } finally {
        inFlightFolders.current.delete(folderId);
      }
    },
  });
}
