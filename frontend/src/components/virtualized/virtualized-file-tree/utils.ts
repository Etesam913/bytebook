import type {
  FileOrFolder,
  FlattenedFileOrFolder,
  VirtualizedFileTreeItem,
} from './types';
import { FOLDER_TYPE, LOAD_MORE_TYPE } from './types';
import { createFilePath } from '../../../utils/path';
import {
  getFileSelectionKey,
  getKeyForSidebarSelection,
} from '../../../utils/selection';

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

/**
 * Helper function to add a file to the map and update its parent's childrenIds.
 * Returns the updated map, or the original map if the parent doesn't exist or isn't a folder.
 */
export function addFileToFileTreeMap({
  map,
  fileId,
  fileName,
  parentId,
}: {
  map: Map<string, FileOrFolder>;
  fileId: string;
  fileName: string;
  parentId: string;
}): Map<string, FileOrFolder> {
  const parent = map.get(parentId);
  if (!parent || parent.type !== 'folder') {
    return map;
  }

  const newMap = new Map(map);

  // Add the new file
  newMap.set(fileId, {
    id: fileId,
    name: fileName,
    type: 'file',
    parentId,
  });

  // Update parent's childrenIds (sorted alphabetically and remove duplicates)
  const updatedChildren = [...parent.childrenIds, fileId]
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
 * Helper function to remove a file from the map and update its parent's childrenIds.
 * Returns the updated map, or the original map if the parent doesn't exist or isn't a folder.
 */
export function removeFileFromFileTreeMap({
  map,
  fileId,
  parentId,
}: {
  map: Map<string, FileOrFolder>;
  fileId: string;
  parentId: string;
}): Map<string, FileOrFolder> {
  const parent = map.get(parentId);
  if (!parent || parent.type !== 'folder') {
    return map;
  }

  const newMap = new Map(map);

  // Remove the file
  newMap.delete(fileId);

  // Update parent's childrenIds to remove the deleted file
  const updatedChildren = parent.childrenIds.filter((id) => id !== fileId);
  newMap.set(parentId, { ...parent, childrenIds: updatedChildren });

  return newMap;
}

/**
 * Finds the next anchor selection key after removing the current file from the selection.
 * It searches through sibling files in the parent folder, first looking forward from the
 * current position, then backward if no selection is found after.
 *
 * @param params.fileOrFolderMap - Map of file/folder IDs to their corresponding FileOrFolder objects
 * @param params.dataItem - The file item that was removed from selection
 * @param params.selectionKey - The selection key of the file that was removed
 * @param params.updatedSelections - The updated set of selection keys after removal
 * @returns The selection key to use as the new anchor, or null if none found
 */
export function getAnchorAfterRemoval({
  fileOrFolderMap,
  dataItem,
  selectionKey,
  updatedSelections,
}: {
  fileOrFolderMap: Map<string, FileOrFolder>;
  dataItem: FlattenedFileOrFolder;
  selectionKey: string;
  updatedSelections: Set<string>;
}): string | null {
  if (!dataItem.parentId) {
    return null;
  }

  const parentFolder = fileOrFolderMap.get(dataItem.parentId);
  if (!parentFolder || parentFolder.type !== 'folder') {
    return null;
  }

  const orderedSelectionKeys: string[] = [];
  for (const childId of parentFolder.childrenIds) {
    const childItem = fileOrFolderMap.get(childId);
    if (!childItem || childItem.type !== 'file') continue;
    const childFilePath = createFilePath(childItem.id);
    if (!childFilePath) continue;
    orderedSelectionKeys.push(
      getKeyForSidebarSelection({
        ...childFilePath,
        id: childItem.id,
      })
    );
  }

  const currentIndex = orderedSelectionKeys.indexOf(selectionKey);
  if (currentIndex === -1) {
    return null;
  }

  // Get the first selection key after the one that was un-selected
  for (
    let index = currentIndex + 1;
    index < orderedSelectionKeys.length;
    index += 1
  ) {
    const candidateKey = orderedSelectionKeys[index];
    if (updatedSelections.has(candidateKey)) {
      return candidateKey;
    }
  }

  // Get the first selection key before the one that was un-selected if there is no selection key after the one that was un-selected
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const candidateKey = orderedSelectionKeys[index];
    if (updatedSelections.has(candidateKey)) {
      return candidateKey;
    }
  }

  return null;
}

/**
 * Computes the new selections for shift-click behavior by selecting a range of items
 * between the anchor index and the clicked index.
 *
 * @param params.fileOrFolderMap - Map of file/folder IDs to their corresponding FileOrFolder objects
 * @param params.dataItem - The file item that was clicked
 * @param params.anchorSelectionKey - The selection key of the anchor item
 * @returns An object containing the new selections set, or null if the operation is invalid
 */
export function computeShiftClickSelections({
  fileOrFolderMap,
  dataItem,
  anchorSelectionKey,
}: {
  fileOrFolderMap: Map<string, FileOrFolder>;
  dataItem: FlattenedFileOrFolder;
  anchorSelectionKey: string;
}): { selections: Set<string> } | null {
  const anchorSelectionId = getFileSelectionKey(anchorSelectionKey);
  if (!anchorSelectionId) {
    return null;
  }
  const anchorSelectionItem = fileOrFolderMap.get(anchorSelectionId);

  // You cannot select across parents using shift click
  if (
    !anchorSelectionItem ||
    !dataItem.parentId ||
    anchorSelectionItem.parentId !== dataItem.parentId
  ) {
    return null;
  }

  const parentFolder = fileOrFolderMap.get(dataItem.parentId);
  if (!parentFolder || parentFolder.type !== 'folder') {
    return null;
  }

  const startIndex = parentFolder.childrenIds.indexOf(anchorSelectionItem.id);
  const endIndex = parentFolder.childrenIds.indexOf(dataItem.id);
  if (startIndex === -1 || endIndex === -1) {
    return null;
  }

  const [rangeStart, rangeEnd] =
    startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

  const updatedSelections = new Set<string>();

  // Go through the range and select each file in the range
  for (let index = rangeStart; index <= rangeEnd; index += 1) {
    const childId = parentFolder.childrenIds[index];
    const childItem = fileOrFolderMap.get(childId);

    // Skips folders
    if (!childItem || childItem.type !== 'file') continue;

    const childFilePath = createFilePath(childItem.id);
    if (!childFilePath) continue;

    updatedSelections.add(
      getKeyForSidebarSelection({
        ...childFilePath,
        id: childItem.id,
      })
    );
  }

  return { selections: updatedSelections };
}

/**
 * Computes the new sidebar selection state for meta-click (cmd+click) behavior.
 * If the file is already selected, it will be un-selected and the anchor will be updated.
 * If the file is not selected, this function returns null (the caller should add it to selection).
 *
 * @param params.fileOrFolderMap - Map of file/folder IDs to their corresponding FileOrFolder objects
 * @param params.dataItem - The file item that was clicked
 * @param params.selectionKey - The selection key of the clicked item
 * @param params.currentSelections - The current set of selection keys
 * @returns An object containing the new selections and anchor, or null if the file should be added to selection
 */
export function computeMetaClickState({
  fileOrFolderMap,
  dataItem,
  selectionKey,
  currentSelections,
}: {
  fileOrFolderMap: Map<string, FileOrFolder>;
  dataItem: FlattenedFileOrFolder;
  selectionKey: string;
  currentSelections: Set<string>;
}): { selections: Set<string>; anchorSelection: string | null } | null {
  if (!currentSelections.has(selectionKey)) {
    // File is not selected, caller should add it to selection
    return null;
  }

  // cmd+click on a selected file will un-select it
  // It also updates the anchor selection to the next item in the selection set
  // or the previous item if the next item is not selected
  const newSelections = new Set(currentSelections);
  newSelections.delete(selectionKey);

  const nextAnchor =
    getAnchorAfterRemoval({
      fileOrFolderMap,
      dataItem,
      selectionKey,
      updatedSelections: newSelections,
    }) ??
    (newSelections.values().next().value as string | undefined) ??
    null;

  return {
    selections: newSelections,
    anchorSelection: nextAnchor,
  };
}
