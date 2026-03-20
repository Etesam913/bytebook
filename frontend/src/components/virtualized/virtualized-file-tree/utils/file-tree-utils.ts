import type {
  FileOrFolder,
  FlattenedFileOrFolder,
  Folder,
  VirtualizedFileTreeItem,
} from '../types';
import { FILE_TYPE, FOLDER_TYPE, LOAD_MORE_TYPE } from '../types';
import type { FileTreeData } from '../../../../atoms';
import { createFilePath, createFolderPath } from '../../../../utils/path';

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
 *
 * Finds the closest sibling node (file or folder) to the deleted node in the parent.
 * @param treeData - The tree data map.
 * @param deletedNodeId - The id of the node that was deleted.
 * @param parentId - The id of the parent of the deleted node.
 * @returns The closest sibling node, or null if none found.
 */
function getClosestNodeToDeletedInParent({
  treeData,
  deletedNodeId,
  parentId,
}: {
  treeData: Map<string, FileOrFolder>;
  deletedNodeId: string;
  parentId: string;
}) {
  const parent = treeData.get(parentId);
  if (!parent || parent.type !== 'folder') {
    return null;
  }

  const indexOfDeletedNodeId = parent.childrenIds.indexOf(deletedNodeId);

  if (indexOfDeletedNodeId === -1) {
    return null;
  }

  const { childrenIds } = parent;

  const getNodeAtIndex = (index: number) => {
    const childId = childrenIds[index];
    const childData = treeData.get(childId);
    if (!childData) {
      return null;
    }
    return childData;
  };

  // Expand outward from the deleted index to find the nearest sibling.
  let leftPointer = indexOfDeletedNodeId - 1;
  let rightPointer = indexOfDeletedNodeId + 1;
  while (leftPointer > -1 || rightPointer < childrenIds.length) {
    // Keep right-side preference on ties to match previous behavior.
    if (rightPointer < childrenIds.length) {
      const rightNode = getNodeAtIndex(rightPointer);
      if (rightNode) {
        return rightNode;
      }
      rightPointer += 1;
    }

    if (leftPointer > -1) {
      const leftNode = getNodeAtIndex(leftPointer);
      if (leftNode) {
        return leftNode;
      }
      leftPointer -= 1;
    }
  }

  return null;
}

/**
 * Finds the nearest sibling node (file or folder) for a deleted path.
 * Returns null when the deleted node or its parent cannot be resolved.
 */
export function getClosestSiblingForDeletedPath({
  fileTreeData,
  deletedPath,
}: {
  fileTreeData: FileTreeData;
  deletedPath: string;
}): FileOrFolder | null {
  // Use the helper to get the node from the path
  const deletedNodeData = getTreeNodeFromPath(fileTreeData, deletedPath);
  if (!deletedNodeData) {
    return null;
  }

  // Use the helper to get the parent node from the path
  const parentNode = getParentNodeFromPath(fileTreeData, deletedPath);
  if (!parentNode) {
    return null;
  }

  return getClosestNodeToDeletedInParent({
    treeData: fileTreeData.treeData,
    deletedNodeId: deletedNodeData.id,
    parentId: parentNode.id,
  });
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

/**
 * Extracts the file/folder name from the last segment of a path.
 */
export function getNewlyCreatedNodeNameFromPath(
  newlyCreatedNodePath: string
): string {
  const segments = newlyCreatedNodePath.split('/').filter(Boolean);
  return segments[segments.length - 1];
}

/**
 * Returns true if the newly created node's name would be inserted somewhere
 * before the last loaded child of its parent (i.e. it belongs within the
 * already-visible range). Returns false when the name sorts after all loaded
 * children, meaning it would land at the end (possibly beyond a pagination
 * boundary).
 */
export function isCreatedNodeInParentLoadedChildren(
  fileTreeData: FileTreeData,
  newlyCreatedNodePath: string
): boolean {
  const newlyCreatedNodeName =
    getNewlyCreatedNodeNameFromPath(newlyCreatedNodePath);

  const parent = getParentNodeFromPath(fileTreeData, newlyCreatedNodePath);
  if (!parent || parent.type !== FOLDER_TYPE) return false;

  const childrenNames = parent.childrenIds
    .map((id) => fileTreeData.treeData.get(id)?.name)
    .filter((name): name is string => name !== undefined);

  if (childrenNames.length === 0) return false;

  const lastChildName = childrenNames[childrenNames.length - 1];
  return newlyCreatedNodeName.localeCompare(lastChildName) < 0;
}

/**
 * Places the newly created node in the parent's loaded children, maintaining sorted order.
 * Returns the updated list of child IDs for the parent node and the created node id.
 */
export function placeCreatedNodeInParentLoadedChildren(
  fileTreeData: FileTreeData,
  newlyCreatedNodePath: string
): {
  newChildrenIds: string[];
  newlyCreatedNodeId: string;
} {
  const newlyCreatedNodeName =
    getNewlyCreatedNodeNameFromPath(newlyCreatedNodePath);
  const newlyCreatedNodeId = globalThis.crypto.randomUUID();

  const parent = getParentNodeFromPath(fileTreeData, newlyCreatedNodePath);
  if (!parent || parent.type !== FOLDER_TYPE) {
    return { newChildrenIds: [], newlyCreatedNodeId };
  }

  const parentChildrenNames = parent.childrenIds
    .map((id) => fileTreeData.treeData.get(id)?.name)
    .filter((name): name is string => name !== undefined);

  const sortedNewChildrenNames = [...parentChildrenNames, newlyCreatedNodeName];
  sortedNewChildrenNames.sort();

  const sortedNewChildrenIds = sortedNewChildrenNames.map((name) => {
    const id = parent.childrenIds.find(
      (id) => fileTreeData.treeData.get(id)?.name === name
    );
    return id ?? newlyCreatedNodeId;
  });

  return {
    newChildrenIds: sortedNewChildrenIds,
    newlyCreatedNodeId,
  };
}

/**
 * Recursively removes a node and all its descendants from the provided maps.
 * Unlike `removeSubtree`, this works on standalone maps rather than a FileTreeData object.
 */
function removeSubtreeFromMaps(
  treeData: Map<string, FileOrFolder>,
  filePathToTreeDataId: Map<string, string>,
  nodeId: string
): void {
  const node = treeData.get(nodeId);
  if (!node) return;

  if (node.type === FOLDER_TYPE) {
    for (const childId of node.childrenIds) {
      removeSubtreeFromMaps(treeData, filePathToTreeDataId, childId);
    }
  }

  filePathToTreeDataId.delete(node.path);
  treeData.delete(nodeId);
}

/**
 * Immutably removes a deleted node (and its subtree) from the file tree.
 * Returns updated FileTreeData, or null if the node is already absent.
 */
export function removeDeletedNodeFromFileTree(
  prev: FileTreeData,
  path: string
): FileTreeData | null {
  const nodeId = prev.filePathToTreeDataId.get(path);
  if (!nodeId) return null;

  const newTreeData = new Map(prev.treeData);
  const newFilePathToTreeDataId = new Map(prev.filePathToTreeDataId);

  // Remove from parent's childrenIds
  const parent = getParentNodeFromPath(prev, path);
  if (parent) {
    newTreeData.set(parent.id, {
      ...parent,
      childrenIds: parent.childrenIds.filter((id) => id !== nodeId),
    });
  }

  // Remove the node and its subtree
  removeSubtreeFromMaps(newTreeData, newFilePathToTreeDataId, nodeId);

  return {
    treeData: newTreeData,
    filePathToTreeDataId: newFilePathToTreeDataId,
  };
}

/**
 * Optimistically inserts a newly created node into the file tree data.
 * Returns updated FileTreeData if insertion succeeded, or null if skipped
 * (path already exists, no parent found, or node sorts beyond loaded children).
 */
export function insertCreatedNodeIntoFileTree(
  prev: FileTreeData,
  path: string,
  nodeType: 'folder' | 'file'
): FileTreeData | null {
  // Skip if already in tree
  if (prev.filePathToTreeDataId.has(path)) {
    return null;
  }

  const parent = getParentNodeFromPath(prev, path);
  if (!parent) {
    return null;
  }

  // Check if node fits within loaded children range
  // If it does not, then useRevealRoutePath will reveal the node on navigation to the path
  if (!isCreatedNodeInParentLoadedChildren(prev, path)) {
    return null;
  }

  const { newChildrenIds, newlyCreatedNodeId } =
    placeCreatedNodeInParentLoadedChildren(prev, path);

  const newTreeData = new Map(prev.treeData);
  const newFilePathToTreeDataId = new Map(prev.filePathToTreeDataId);

  // Update parent's children
  newTreeData.set(parent.id, {
    ...parent,
    childrenIds: newChildrenIds,
  });

  // Add the new node
  const nodeName = getNewlyCreatedNodeNameFromPath(path);
  if (nodeType === 'folder') {
    newTreeData.set(newlyCreatedNodeId, {
      type: FOLDER_TYPE,
      name: nodeName,
      path,
      childrenIds: [],
      id: newlyCreatedNodeId,
      parentId: parent.id,
      hasMoreChildren: false,
      isOpen: false,
      childrenCursor: '',
    });
  } else {
    newTreeData.set(newlyCreatedNodeId, {
      type: FILE_TYPE,
      name: nodeName,
      path,
      id: newlyCreatedNodeId,
      parentId: parent.id,
    });
  }

  newFilePathToTreeDataId.set(path, newlyCreatedNodeId);

  return {
    treeData: newTreeData,
    filePathToTreeDataId: newFilePathToTreeDataId,
  };
}

/**
 * Converts a FileOrFolder node to an encoded route URL.
 */
export function nodeToEncodedUrl(node: FileOrFolder): string | null {
  if (node.type === FILE_TYPE) {
    return createFilePath(node.path)?.encodedFileUrl ?? null;
  }
  return createFolderPath(node.path)?.encodedFolderUrl ?? null;
}

/**
 * Gets the path to navigate to if the current route is among the deleted paths.
 * Finds the topmost (shallowest) affected deleted path and searches for the first
 * non-deleted sibling below it, then above it, in that path's parent.
 * Falls back to the parent folder, then `/`.
 */
export function getNavigationTargetForDeletedPaths({
  currentRoutePath,
  fileTreeData,
  paths,
}: {
  currentRoutePath: string | null;
  fileTreeData: FileTreeData;
  paths: string[];
}): string | null {
  if (!currentRoutePath) return null;

  // Filter to only paths that affect the current route (exact match or ancestor)
  const affectingPaths = paths.filter((deletedPath) => {
    return (
      deletedPath === currentRoutePath ||
      currentRoutePath.startsWith(deletedPath + '/')
    );
  });
  if (affectingPaths.length === 0) return null;

  const deletedPathSet = new Set(paths);

  // Find the topmost (shallowest) affecting path — fewest segments
  const topmostPath = affectingPaths.reduce((shallowest, path) => {
    const depth = path.split('/').filter(Boolean).length;
    const shallowestDepth = shallowest.split('/').filter(Boolean).length;
    return depth <= shallowestDepth ? path : shallowest;
  });

  const parentNode = getParentNodeFromPath(fileTreeData, topmostPath);
  if (!parentNode) return '/';

  const topmostNode = getTreeNodeFromPath(fileTreeData, topmostPath);
  const topmostIndex = topmostNode
    ? parentNode.childrenIds.indexOf(topmostNode.id)
    : -1;

  if (topmostIndex !== -1) {
    const { childrenIds } = parentNode;

    // Search down first (after the topmost deleted item)
    for (let i = topmostIndex + 1; i < childrenIds.length; i++) {
      const child = fileTreeData.treeData.get(childrenIds[i]);
      if (child && !deletedPathSet.has(child.path)) {
        const url = nodeToEncodedUrl(child);
        if (url) return url;
      }
    }

    // Then search up (before the topmost deleted item)
    for (let i = topmostIndex - 1; i >= 0; i--) {
      const child = fileTreeData.treeData.get(childrenIds[i]);
      if (child && !deletedPathSet.has(child.path)) {
        const url = nodeToEncodedUrl(child);
        if (url) return url;
      }
    }
  }

  // Fall back to parent folder
  return createFolderPath(parentNode.path)?.encodedFolderUrl ?? '/';
}

/**
 * Shared logic for removing deleted paths from the file tree.
 *
 * Used by both `useDeleteEvents` (backend event handler) and
 * `useMoveToTrashMutation` (optimistic update) to avoid duplication.
 *
 * Returns an object describing what happened so callers can decide
 * whether to invalidate queries or navigate.
 */
export function removePathsFromFileTree(
  prev: FileTreeData,
  paths: string[]
): { next: FileTreeData; didChange: boolean; needsTopLevelInvalidation: boolean } {
  let current: FileTreeData = prev;
  let didChange = false;
  let needsTopLevelInvalidation = false;

  for (const path of paths) {
    const segments = path.split('/').filter(Boolean);
    if (segments.length <= 1) {
      needsTopLevelInvalidation = true;
      continue;
    }

    const result = removeDeletedNodeFromFileTree(current, path);
    if (!result) continue;

    current = result;
    didChange = true;
  }

  return { next: current, didChange, needsTopLevelInvalidation };
}
