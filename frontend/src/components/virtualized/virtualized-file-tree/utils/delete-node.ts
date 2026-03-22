import type { FileOrFolder } from '../types';
import { FILE_TYPE, FOLDER_TYPE } from '../types';
import type { FileTreeData } from '../../../../atoms';
import { createFilePath, createFolderPath } from '../../../../utils/path';
import { getParentNodeFromPath, getTreeNodeFromPath } from './file-tree-utils';

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
function removeDeletedNodeFromFileTree(
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
 * Converts a FileOrFolder node to an encoded route URL.
 */
function nodeToEncodedUrl(node: FileOrFolder): string | null {
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
): {
  next: FileTreeData;
  didChange: boolean;
  needsTopLevelInvalidation: boolean;
} {
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
