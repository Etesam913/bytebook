import type {
  FileOrFolder,
  FlattenedFileOrFolder,
  VirtualizedFileTreeItem,
} from './types';
import { FOLDER_TYPE, LOAD_MORE_TYPE } from './types';

/**
 * Transforms a hierarchical file tree structure into a flattened array suitable for
 * rendering in a virtualized list.
 *
 * This function performs a depth-first traversal of the file tree, converting nested
 * folders and files into a linear array. Each item in the resulting array includes a
 * `level` property indicating its nesting depth (0 for top-level items).
 *
 * Only children of open folders are included in the flattened output. Closed folders
 * appear as single entries without their children.
 *
 * @param data - Array of top-level FileOrFolder items to transform
 * @param fileOrFolderMap - Map of file/folder IDs to their corresponding FileOrFolder
 *   objects, used to look up children by ID during traversal
 * @returns A flattened array of FileOrFolder items with `level` properties, ready
 *   for virtualization
 *
 * @example
 * ```ts
 * const tree = [
 *   { id: '1', name: 'Folder', type: 'folder', isOpen: true, childrenIds: ['2', '3'], ... },
 * ];
 * const map = new Map([
 *   ['1', tree[0]],
 *   ['2', { id: '2', name: 'File', type: 'file', ... }],
 * ]);
 * const flattened = transformFileTreeForVirtualizedList(tree, map);
 * // Result: [
 * //   { id: '1', name: 'Folder', type: 'folder', level: 0, ... },
 * //   { id: '2', name: 'File', type: 'file', level: 1, ... },
 * // ]
 * ```
 */
export function transformFileTreeForVirtualizedList(
  data: FileOrFolder[],
  fileOrFolderMap: Map<string, FileOrFolder>
): VirtualizedFileTreeItem[] {
  function transformAFileOrFolder(
    fileOrFolder: FileOrFolder,
    level: number
  ): VirtualizedFileTreeItem[] {
    const updatedFileOrFolderData = fileOrFolderMap.get(fileOrFolder.id);
    if (!updatedFileOrFolderData) return [];

    const flattenedEntryForFileOrFolder: FlattenedFileOrFolder = {
      ...updatedFileOrFolderData,
      level,
    };

    switch (updatedFileOrFolderData.type) {
      case 'folder': {
        const allEntriesForFolder: VirtualizedFileTreeItem[] = [
          flattenedEntryForFileOrFolder,
        ];

        if (updatedFileOrFolderData.isOpen) {
          // If the folder is open, the flattened representation for the virtualized list
          // has to include the next level of children. That is why dfs is happening
          for (const childId of updatedFileOrFolderData.childrenIds) {
            const childFileOrFolder = fileOrFolderMap.get(childId);
            if (!childFileOrFolder) continue;
            const children = transformAFileOrFolder(
              childFileOrFolder,
              level + 1
            );
            for (const child of children) {
              allEntriesForFolder.push(child);
            }
          }
        }

        if (
          updatedFileOrFolderData.isOpen &&
          updatedFileOrFolderData.hasMoreChildren
        ) {
          allEntriesForFolder.push({
            id: `load-more-${updatedFileOrFolderData.id}`,
            type: LOAD_MORE_TYPE,
            parentId: updatedFileOrFolderData.id,
            name: 'Load more...',
            level: level + 1,
          });
        }

        return allEntriesForFolder;
      }
      case 'file':
      default:
        return [flattenedEntryForFileOrFolder];
    }
  }
  return data.flatMap((fileOrFolder) =>
    transformAFileOrFolder(fileOrFolder, 0)
  );
}

/**
 * Recursively removes a file or folder and all its descendants from the file tree map.
 *
 * This function performs a depth-first traversal starting from the given root ID,
 * deleting each node it encounters. For folders, it first removes all children
 * before removing the folder itself.
 */
export function removeSubtree(
  map: Map<string, FileOrFolder>,
  rootId: string
): void {
  const root = map.get(rootId);
  if (!root) return;
  if (root.type === FOLDER_TYPE) {
    for (const childId of root.childrenIds) {
      removeSubtree(map, childId);
    }
  }
  map.delete(rootId);
}

/**
 * Reconciles the file tree map with new top-level data while preserving folder state.
 *
 * This function updates the map by removing top-level items that no longer exist
 * in the new data (including their subtrees), and merging new data while preserving
 * existing folder state such as `isOpen`, `childrenIds`, `childrenCursor`,
 * and `hasMoreChildren` for folders that already exist in the map.
 */
export function reconcileTopLevelFileTreeMap(
  previousMapData: Map<string, FileOrFolder>,
  newData: FileOrFolder[]
): Map<string, FileOrFolder> {
  const newIds = new Set(newData.map((item) => item.id));
  const updatedMap = new Map(previousMapData);

  for (const [id, node] of previousMapData) {
    // Remove top level folders that are not in the updated data
    if (node.parentId === null && !newIds.has(id)) {
      removeSubtree(updatedMap, id);
    }
  }

  for (const node of newData) {
    if (node.type === FOLDER_TYPE) {
      const prevNode = previousMapData.get(node.id);
      updatedMap.set(node.id, {
        ...node,
        isOpen: prevNode?.type === FOLDER_TYPE ? prevNode.isOpen : false,
        childrenIds: prevNode?.type === FOLDER_TYPE ? prevNode.childrenIds : [],
        childrenCursor:
          prevNode?.type === FOLDER_TYPE ? prevNode.childrenCursor : null,
        hasMoreChildren:
          prevNode?.type === FOLDER_TYPE ? prevNode.hasMoreChildren : false,
      });
    } else {
      updatedMap.set(node.id, node);
    }
  }

  return updatedMap;
}

/**
 * Helper function to add a folder to the map and update its parent's childrenIds.
 * Returns the updated map, or the original map if the parent doesn't exist or isn't a folder.
 */
export function addFolderToFileTreeMap({
  map,
  folderId,
  folderName,
  parentId,
  childrenIds = [],
  childrenCursor = null,
  hasMoreChildren = false,
  isOpen = false,
}: {
  map: Map<string, FileOrFolder>;
  folderId: string;
  folderName: string;
  parentId: string;
  childrenIds?: string[];
  childrenCursor?: string | null;
  hasMoreChildren?: boolean;
  isOpen?: boolean;
}): Map<string, FileOrFolder> {
  const parent = map.get(parentId);
  if (!parent || parent.type !== 'folder') {
    return map;
  }

  const newMap = new Map(map);

  // Add the new folder
  newMap.set(folderId, {
    id: folderId,
    name: folderName,
    type: 'folder',
    parentId,
    childrenIds,
    childrenCursor,
    hasMoreChildren,
    isOpen,
  });

  // Update parent's childrenIds (sorted alphabetically and remove duplicates)
  const updatedChildren = [...parent.childrenIds, folderId]
    .filter((id, index, arr) => arr.indexOf(id) === index)
    .sort((a, b) => {
      const aName = a.split('/').pop() ?? a;
      const bName = b.split('/').pop() ?? b;
      return aName.localeCompare(bName);
    });
  newMap.set(parentId, { ...parent, childrenIds: updatedChildren });

  return newMap;
}

/**
 * Helper function to remove a folder from the map and update its parent's childrenIds.
 * Returns the updated map, or the original map if the parent doesn't exist or isn't a folder.
 */
export function removeFolderFromFileTreeMap({
  map,
  folderId,
  parentId,
}: {
  map: Map<string, FileOrFolder>;
  folderId: string;
  parentId: string;
}): Map<string, FileOrFolder> {
  const parent = map.get(parentId);
  if (!parent || parent.type !== 'folder') {
    return map;
  }

  const newMap = new Map(map);

  // Remove the folder and all its descendants
  removeSubtree(newMap, folderId);

  // Update parent's childrenIds to remove the deleted folder
  const updatedChildren = parent.childrenIds.filter((id) => id !== folderId);
  newMap.set(parentId, { ...parent, childrenIds: updatedChildren });

  return newMap;
}
