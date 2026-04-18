import type { FileTreeData } from '../../../../atoms';
import { FILE_TYPE, FOLDER_TYPE } from '../types';
import { getParentNodeFromPath, isTreeNodeAFolder } from './file-tree-utils';

/**
 * Extracts the file/folder name from the last segment of a path.
 */
function getNewlyCreatedNodeNameFromPath(newlyCreatedNodePath: string): string {
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
function isCreatedNodeInParentLoadedChildren(
  fileTreeData: FileTreeData,
  newlyCreatedNodePath: string
): boolean {
  const newlyCreatedNodeName =
    getNewlyCreatedNodeNameFromPath(newlyCreatedNodePath);

  const parent = getParentNodeFromPath(fileTreeData, newlyCreatedNodePath);
  if (!parent || !isTreeNodeAFolder(parent)) return false;

  const childrenNames = parent.childrenIds
    .map((id) => fileTreeData.treeData.get(id)?.name)
    .filter((name): name is string => name !== undefined);

  // When the folder is fully loaded, any newly created item should be visible,
  // including items that sort to the end of the list.
  if (!parent.hasMoreChildren) return true;

  if (childrenNames.length === 0) return false;

  const lastChildName = childrenNames[childrenNames.length - 1];
  return newlyCreatedNodeName.localeCompare(lastChildName) < 0;
}

/**
 * Places the newly created node in the parent's loaded children, maintaining sorted order.
 * Returns the updated list of child IDs for the parent node and the created node id.
 */
function placeCreatedNodeInParentLoadedChildren(
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
  if (!parent || !isTreeNodeAFolder(parent)) {
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
