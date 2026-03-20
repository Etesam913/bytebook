import type {
  FileOrFolder,
  FlattenedFileOrFolder,
  Folder,
  VirtualizedFileTreeItem,
} from '../types';
import { FOLDER_TYPE, LOAD_MORE_TYPE } from '../types';
import type { FileTreeData } from '../../../../atoms';

/**
 * Calculates the padding-left (indent) value for a file tree item based on its level.
 * @param level - The nesting level of the item (0 for root-level items)
 * @param currentZoom - The current zoom factor to adjust the indent
 * @returns The calculated padding-left value in pixels
 */
export function getFileTreeItemIndent(
  level: number,
  currentZoom: number
): number {
  const INDENT_WIDTH = 18;
  return ((level + 1) * INDENT_WIDTH) / currentZoom;
}

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
  const flattenedData: VirtualizedFileTreeItem[] = [];

  function flattenFileOrFolder(fileOrFolderId: string, level: number): void {
    const updatedFileOrFolderData = fileOrFolderMap.get(fileOrFolderId);
    if (!updatedFileOrFolderData) return;

    const flattenedEntryForFileOrFolder: FlattenedFileOrFolder = {
      ...updatedFileOrFolderData,
      level,
    };
    flattenedData.push(flattenedEntryForFileOrFolder);

    if (updatedFileOrFolderData.type !== 'folder') return;
    if (!updatedFileOrFolderData.isOpen) return;

    // If the folder is open, the flattened representation for the virtualized list
    // has to include the next level of children. That is why dfs is happening
    for (const childId of updatedFileOrFolderData.childrenIds) {
      flattenFileOrFolder(childId, level + 1);
    }

    if (updatedFileOrFolderData.hasMoreChildren) {
      flattenedData.push({
        id: `load-more-${updatedFileOrFolderData.id}`,
        type: LOAD_MORE_TYPE,
        parentId: updatedFileOrFolderData.id,
        name: 'Load more...',
        level: level + 1,
      });
    }
  }

  for (const fileOrFolder of data) {
    flattenFileOrFolder(fileOrFolder.id, 0);
  }

  return flattenedData;
}

/**
 * Recursively removes a file or folder and all its descendants from the file tree map.
 *
 * This function performs a depth-first traversal starting from the given root ID,
 * deleting each node it encounters. For folders, it first removes all children
 * before removing the folder itself.
 *
 * @example
 * const tree: FileTreeData = {
 *   treeData: new Map([
 *     ['id1', { id: 'id1', path: 'Projects', name: 'Projects', type: 'folder', childrenIds: ['id2'], parentId: null, isOpen: true }],
 *     ['id2', { id: 'id2', path: 'Projects/App.ts', name: 'App.ts', type: 'file', parentId: 'id1' }]
 *   ]),
 *   filePathToTreeDataId: new Map([['Projects', 'id1'], ['Projects/App.ts', 'id2']])
 * };
 *
 * removeSubtree(tree, 'id1');
 * // Both 'id1' and its child 'id2' are removed from treeData and the path index.
 * // tree.treeData.size === 0
 *
 * @param fileTreeData - The file tree state object containing the maps to update.
 * @param folderIdToRemove - The unique ID of the file or folder to start removal from.
 */
export function removeSubtree(
  fileTreeData: FileTreeData,
  folderIdToRemove: string
): void {
  const { treeData, filePathToTreeDataId } = fileTreeData;
  const root = treeData.get(folderIdToRemove);
  if (!root || root.type !== FOLDER_TYPE) return;

  for (const childId of root.childrenIds) {
    removeSubtree(fileTreeData, childId);
  }

  // Remove from both maps to keep in sync
  filePathToTreeDataId.delete(root.path);
  treeData.delete(folderIdToRemove);
}

/**
 * Reconciles the existing file tree state with new top-level data from the backend.
 *
 * This function updates the map by removing top-level items that no longer exist
 * in the new data (including their subtrees), and merging new data while preserving
 * existing folder state such as `isOpen`, `childrenIds`, `childrenCursor`,
 * and `hasMoreChildren` for folders that already exist in the map. Paths are
 * used to match prior nodes when IDs change between fetches.
 *
 * @example
 * const previousTree: FileTreeData = {
 *   treeData: new Map([
 *     ['id1', { id: 'id1', path: 'Work', name: 'Work', type: 'folder', isOpen: true, parentId: null, childrenIds: ['id2'] }],
 *     ['id2', { id: 'id2', path: 'Work/todo.md', name: 'todo.md', type: 'file', parentId: 'id1' }],
 *     ['id3', { id: 'id3', path: 'OldProject', name: 'OldProject', type: 'folder', parentId: null, childrenIds: [] }]
 *   ]),
 *   filePathToTreeDataId: new Map([['Work', 'id1'], ['Work/todo.md', 'id2'], ['OldProject', 'id3']])
 * };
 *
 * const newData: FileOrFolder[] = [
 *   { id: 'id1', path: 'Work', name: 'Work', type: 'folder', parentId: null, childrenIds: [] }
 * ];
 *
 * const result = reconcileTopLevelFileTreeMap(previousTree, newData);
 * // result.get('id1').isOpen is true (preserved from previousTree)
 * // result.get('id2') still exists because it's a child of id1 and id1 was preserved.
 * // result.get('id3') is removed because it is top level and not in newData.
 *
 * @param previousFileTreeData - The current state of the file tree.
 * @param newData - The fresh list of top-level items from the backend.
 * @returns A new Map representing the updated treeData.
 */
export function reconcileTopLevelFileTreeMap(
  previousFileTreeData: FileTreeData,
  newData: FileOrFolder[]
): Map<string, FileOrFolder> {
  const newPaths = new Set(newData.map((item) => item.path));
  const updatedTreeData = new Map(previousFileTreeData.treeData);
  const updatedFilePathToTreeDataId = new Map(
    previousFileTreeData.filePathToTreeDataId
  );
  const updatedFileTreeData: FileTreeData = {
    treeData: updatedTreeData,
    filePathToTreeDataId: updatedFilePathToTreeDataId,
  };

  for (const [id, node] of previousFileTreeData.treeData) {
    // Remove top level folders and all of their children (subtrees) that are not in the updated data
    if (isFileTreeNodeTopLevel(node) && !newPaths.has(node.path)) {
      removeSubtree(updatedFileTreeData, id);
    }
  }

  for (const node of newData) {
    const nodeInPreviousData = getTreeNodeFromPath(
      previousFileTreeData,
      node.path
    );

    if (nodeInPreviousData) {
      // If the node exists in the previous data, delete it from the updated tree to replace it with the new node
      updatedTreeData.delete(nodeInPreviousData.path);
      updatedFilePathToTreeDataId.delete(node.path);
    }

    if (node.type === FOLDER_TYPE) {
      const isPreviousNodeFolder = nodeInPreviousData?.type === FOLDER_TYPE;

      // If the node exists in the previous data and is a folder, then use its properties to maintain state
      // Otherwise, use the new node's default properties
      const { isOpen, childrenIds, childrenCursor, hasMoreChildren } =
        nodeInPreviousData && isPreviousNodeFolder ? nodeInPreviousData : node;

      updatedTreeData.set(node.id, {
        ...node,
        isOpen,
        childrenIds,
        childrenCursor,
        hasMoreChildren,
      });
    } else {
      updatedTreeData.set(node.id, node);
    }
  }

  return updatedTreeData;
}

/**
 * Helper function to remove a folder from the map and update its parent's childrenIds.
 * Returns the updated map, or the original map if the parent doesn't exist or isn't a folder.
 */
export function removeFolderFromFileTreeMap({
  fileTreeData,
  folderId,
  parentId,
}: {
  fileTreeData: FileTreeData;
  folderId: string;
  parentId: string;
}): FileTreeData {
  const parent = fileTreeData.treeData.get(parentId);
  if (!parent || parent.type !== 'folder') {
    return fileTreeData;
  }

  const updatedFileTreeData: FileTreeData = {
    treeData: new Map(fileTreeData.treeData),
    filePathToTreeDataId: new Map(fileTreeData.filePathToTreeDataId),
  };

  // Remove the folder and all its descendants
  removeSubtree(updatedFileTreeData, folderId);

  // Update parent's childrenIds to remove the deleted folder
  const updatedChildren = parent.childrenIds.filter((id) => id !== folderId);
  updatedFileTreeData.treeData.set(parentId, {
    ...parent,
    childrenIds: updatedChildren,
  });

  return updatedFileTreeData;
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
 * Helper function to get a node from the map using its path.
 * Returns the node, or null if the path doesn't exist.
 */
export function getTreeNodeFromPath(
  fileTreeData: FileTreeData,
  path: string
): FileOrFolder | null {
  const { treeData, filePathToTreeDataId } = fileTreeData;
  const treeDataId = filePathToTreeDataId.get(path);
  if (!treeDataId) {
    return null;
  }
  return treeData.get(treeDataId) ?? null;
}

/**
 * Helper function to get a node's parent from the map using the node path.
 * Returns the parent node, or null when the path is top-level or the parent doesn't exist.
 */
export function getParentNodeFromPath(
  fileTreeData: FileTreeData,
  path: string
): Folder | null {
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 1) {
    return null;
  }

  const parentPath = segments.slice(0, -1).join('/');
  const parentNode = getTreeNodeFromPath(fileTreeData, parentPath);
  if (!parentNode || parentNode.type !== FOLDER_TYPE) {
    return null;
  }
  return parentNode;
}

/**
 * Returns folder paths from shallowest to deepest for a file path.
 * Example: "a/b/c.md" -> ["a", "a/b"]
 */
export function getAncestorFolderPathsFromFilePath(filePath: string): string[] {
  const normalized = filePath.split('/').filter(Boolean);
  if (normalized.length <= 1) {
    return [];
  }

  const folderSegments = normalized.slice(0, -1);
  return folderSegments.map((_, index) =>
    folderSegments.slice(0, index + 1).join('/')
  );
}

/**
 * Returns true when a path exists in the path->id index.
 */
export function pathExistsInFileTree(
  fileTreeData: FileTreeData,
  path: string
): boolean {
  return fileTreeData.filePathToTreeDataId.has(path);
}

/**
 * Determines if a file tree node is top level
 */
export function isFileTreeNodeTopLevel(node: FileOrFolder): boolean {
  return node.parentId === null;
}

/** Returns true if a folder has already had its children fetched from the backend. */
export function hasLoadedChildren(folder: Folder): boolean {
  return (
    folder.childrenIds.length > 0 ||
    folder.childrenCursor !== null ||
    folder.hasMoreChildren
  );
}

