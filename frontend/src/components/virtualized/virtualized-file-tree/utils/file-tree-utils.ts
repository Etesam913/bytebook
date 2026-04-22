import type {
  File,
  FileOrFolder,
  FlattenedFileOrFolder,
  Folder,
  VirtualizedFileTreeItem,
} from '../types';
import { FILE_TYPE, FOLDER_TYPE, LOAD_MORE_TYPE } from '../types';
import type { FileTreeData, ReadonlyFileTreeData } from '../../../../atoms';

/**
 * Calculates the padding-left (indent) value for a file tree item based on its level.
 * @param level - The nesting level of the item (0 for root-level items)
 * @returns The calculated padding-left value as a rem-based CSS length
 */
export function getFileTreeItemIndent(level: number): string {
  const INDENT_WIDTH_REM = 1.125;
  return `${(level + 1) * INDENT_WIDTH_REM}rem`;
}

/**
 * Flattens the file tree map into a linear list for virtualization.
 *
 * Traversal starts only from **top-level** nodes (`parentId === null`); every other
 * entry is reached via `childrenIds` while walking open folders. Each row gets a
 * `level` (0 for roots). Closed folders produce a single row without descending.
 *
 * For open folders with `hasMoreChildren`, a synthetic load-more row (`LOAD_MORE_TYPE`)
 * is appended after the currently loaded children.
 *
 * @param fileOrFolderMap - Map of IDs to `FileOrFolder` values (lookups by `childrenIds`)
 * @returns Flattened items: files, folders, and optional load-more rows, each with `level`
 *
 * @example
 * ```ts
 * const map = new Map<string, FileOrFolder>([
 *   ['1', { id: '1', parentId: null, type: 'folder', isOpen: true, childrenIds: ['2'], ... }],
 *   ['2', { id: '2', parentId: '1', type: 'file', ... }],
 * ]);
 * const flattened = transformFileTreeForVirtualizedList(map);
 * // [
 * //   { id: '1', type: 'folder', level: 0, ... },
 * //   { id: '2', type: 'file', level: 1, ... },
 * // ]
 * ```
 */
export function transformFileTreeForVirtualizedList(
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

    if (
      !isTreeNodeAFolder(updatedFileOrFolderData) ||
      !updatedFileOrFolderData.isOpen
    )
      return;

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

  return Array.from(fileOrFolderMap.values()).reduce(
    (acc: VirtualizedFileTreeItem[], fileOrFolder) => {
      if (!isFileTreeNodeTopLevel(fileOrFolder)) {
        return acc;
      }
      flattenFileOrFolder(fileOrFolder.id, 0);
      return acc;
    },
    flattenedData
  );
}

/**
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
function removeSubtree(
  fileTreeData: FileTreeData,
  folderIdToRemove: string
): void {
  const { treeData, filePathToTreeDataId } = fileTreeData;
  const root = treeData.get(folderIdToRemove);
  if (!root) return;

  if (isTreeNodeAFolder(root)) {
    for (const childId of root.childrenIds) {
      removeSubtree(fileTreeData, childId);
    }
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
  previousFileTreeData: ReadonlyFileTreeData,
  newData: FileOrFolder[]
): FileTreeData {
  const newPaths = new Set(newData.map((item) => item.path));
  const newTreeDataMap = new Map(previousFileTreeData.treeData);
  const newFilePathToTreeDataMap = new Map(
    previousFileTreeData.filePathToTreeDataId
  );
  const newFileTreeData: FileTreeData = {
    treeData: newTreeDataMap,
    filePathToTreeDataId: newFilePathToTreeDataMap,
  };

  for (const [id, node] of previousFileTreeData.treeData) {
    // Remove top level folders and all of their children (subtrees) that are not in the updated data
    if (isFileTreeNodeTopLevel(node) && !newPaths.has(node.path)) {
      removeSubtree(newFileTreeData, id);
    }
  }

  for (const node of newData) {
    const nodeInPreviousData = getTreeNodeFromPath(
      previousFileTreeData,
      node.path
    );

    // Preserve the existing node's id so descendants' parentId pointers stay
    // valid across refetches — the backend generates fresh UUIDs every scan.
    const stableId = nodeInPreviousData?.id ?? node.id;

    if (nodeInPreviousData) {
      newTreeDataMap.delete(nodeInPreviousData.id);
      newFilePathToTreeDataMap.delete(node.path);
    }

    if (isTreeNodeAFolder(node)) {
      const isPreviousNodeFolder =
        nodeInPreviousData && isTreeNodeAFolder(nodeInPreviousData);

      // If the node exists in the previous data and is a folder, then use its properties to maintain state
      // Otherwise, use the new node's default properties
      const { isOpen, childrenIds, childrenCursor, hasMoreChildren } =
        nodeInPreviousData && isPreviousNodeFolder ? nodeInPreviousData : node;

      newTreeDataMap.set(stableId, {
        ...node,
        id: stableId,
        isOpen,
        childrenIds,
        childrenCursor,
        hasMoreChildren,
      });
    } else {
      newTreeDataMap.set(stableId, { ...node, id: stableId });
    }

    newFilePathToTreeDataMap.set(node.path, stableId);
  }

  return newFileTreeData;
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
  if (!parent || !isTreeNodeAFolder(parent)) {
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
  fileTreeData: ReadonlyFileTreeData,
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
  if (!parentNode || !isTreeNodeAFolder(parentNode)) {
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
 * Type guard that checks if a file tree node is a file.
 */
export function isTreeNodeAFile(
  node: FileOrFolder | VirtualizedFileTreeItem
): node is File {
  return node.type === FILE_TYPE;
}

/**
 * Type guard that checks if a file tree node is a folder.
 */
export function isTreeNodeAFolder(
  node: FileOrFolder | VirtualizedFileTreeItem
): node is Folder {
  return node.type === FOLDER_TYPE;
}

/** Returns true if a folder has already had its children fetched from the backend. */
export function hasLoadedChildren(folder: Folder): boolean {
  return (
    folder.childrenIds.length > 0 ||
    folder.childrenCursor !== null ||
    folder.hasMoreChildren
  );
}

/**
 * Returns true when a drop on `dropTargetId` would leave an item with
 * `itemParentId` in the folder it already lives in (i.e. the move is a no-op
 * for that item). Used to skip muting rows whose drag outcome is a no-op.
 */
export function isItemAlreadyInDropDestination({
  fileOrFolderMap,
  itemParentId,
  dropTargetId,
}: {
  fileOrFolderMap: ReadonlyMap<string, FileOrFolder>;
  itemParentId: string | null;
  dropTargetId: string | null;
}): boolean {
  if (!dropTargetId) return false;
  const dropTarget = fileOrFolderMap.get(dropTargetId);
  if (!dropTarget) return false;
  const destinationParentId = isTreeNodeAFolder(dropTarget)
    ? dropTarget.id
    : dropTarget.parentId;
  return itemParentId === destinationParentId;
}

/**
 * Computes the set of tree node IDs to highlight when dragging over a file.
 * Includes the parent folder, all siblings, and recursively all descendants
 * of open sibling folders via BFS.
 */
export function getDragHighlightIds({
  fileOrFolderMap,
  parentId,
}: {
  fileOrFolderMap: ReadonlyMap<string, FileOrFolder>;
  parentId: string | null;
}): Set<string> {
  const ids = new Set<string>();
  const queue: string[] = [];

  if (parentId === null) {
    // Top-level: collect all top-level node IDs
    for (const [id, node] of fileOrFolderMap) {
      if (node.parentId !== null) continue;
      ids.add(id);
      if (isTreeNodeAFolder(node) && node.isOpen) {
        queue.push(id);
      }
    }
  } else {
    // Add the parent folder itself
    ids.add(parentId);
    const parent = fileOrFolderMap.get(parentId);
    if (parent && isTreeNodeAFolder(parent)) {
      for (const childId of parent.childrenIds) {
        ids.add(childId);
        const child = fileOrFolderMap.get(childId);
        if (child && isTreeNodeAFolder(child) && child.isOpen) {
          queue.push(childId);
        }
      }
    }
  }

  // BFS through open folders to collect descendants
  while (queue.length > 0) {
    const folderId = queue.shift()!;
    const folder = fileOrFolderMap.get(folderId);
    if (!folder || !isTreeNodeAFolder(folder)) continue;
    for (const childId of folder.childrenIds) {
      ids.add(childId);
      const child = fileOrFolderMap.get(childId);
      if (child && isTreeNodeAFolder(child) && child.isOpen) {
        queue.push(childId);
      }
    }
  }

  return ids;
}
