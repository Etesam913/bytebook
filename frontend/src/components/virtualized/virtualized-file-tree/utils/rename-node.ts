import type { FileOrFolder } from '../types';
import type { FileTreeData } from '../../../../atoms';
import {
  getParentNodeFromPath,
  getTreeNodeFromPath,
  isFileTreeNodeTopLevel,
  isTreeNodeAFile,
  isTreeNodeAFolder,
  removeFileFromFileTreeMap,
} from './file-tree-utils';

/**
 * Returns the name of the last loaded child of a folder, using the
 * pre-rename tree data. Returns null if the folder has no children
 * or the last child can't be resolved.
 */
function getOriginalLastChildName(
  fileTreeData: FileTreeData,
  parentId: string
): string | null {
  const parent = fileTreeData.treeData.get(parentId);
  if (
    !parent ||
    !isTreeNodeAFolder(parent) ||
    parent.childrenIds.length === 0
  ) {
    return null;
  }
  const lastChildId = parent.childrenIds[parent.childrenIds.length - 1];
  return fileTreeData.treeData.get(lastChildId)?.name ?? null;
}

type NodeUpdate = {
  path: string;
  name: string;
  parentId: string | null;
};

type ParentFolderUpdate = {
  removeChildIds: Set<string>;
  addChildIds: Set<string>;
  /**
   * The name of the last loaded child in this parent *before* any renames
   * were applied. Used as the pagination boundary: after re-sorting, any
   * child whose new name sorts at or after this value is beyond the loaded
   * page and should be removed to avoid duplicates on scroll.
   *
   * Only meaningful when the parent's `hasMoreChildren` is true.
   * Captured once per parent from the pre-rename `fileTreeData` in
   * `buildRenameUpdates` so it reflects original (pre-rename) names.
   */
  originalLastChildName: string | null;
};

type RenameEntry = {
  oldPath: string;
  newPath: string;
};

/**
 * Builds rename metadata by resolving tree nodes, tracking path remaps, and
 * recording parent-child updates required to keep folder children ordered.
 *
 * The `fileTreeData` parameter should be the current (pre-rename) state so that
 * original names are captured correctly for pagination boundary checks.
 */
export function buildRenameUpdates({
  entries,
  fileTreeData,
  isValidNode,
}: {
  entries: RenameEntry[];
  fileTreeData: FileTreeData;
  isValidNode?: (node: FileOrFolder) => boolean;
}): {
  // A map of the old path to the new path.
  pathRemappings: Map<string, string>;
  // A map of the node id to the updates to apply to a node.
  nodeUpdates: Map<string, NodeUpdate>;
  // A map of the parent id to the updates to apply to a parent.
  parentFolderUpdates: Map<string, ParentFolderUpdate>;
  // Whether the top-level query needs to be invalidated.
  needsTopLevelInvalidation: boolean;
} {
  const pathRemappings = new Map<string, string>();
  const nodeUpdates = new Map<string, NodeUpdate>();
  const parentFolderUpdates = new Map<string, ParentFolderUpdate>();
  let needsTopLevelInvalidation = false;

  const isValid = isValidNode ?? (() => true);

  for (const { oldPath, newPath } of entries) {
    const newSegments = newPath.split('/').filter(Boolean);
    const oldSegments = oldPath.split('/').filter(Boolean);

    // A rename touches the top level if either the old or new path is a
    // root-level item (single segment). This check must happen BEFORE the
    // early-continue so that entries whose source node isn't loaded in the
    // tree still trigger query invalidation.
    if (newSegments.length === 1 || oldSegments.length === 1) {
      needsTopLevelInvalidation = true;
    }

    const treeDataNode = getTreeNodeFromPath(fileTreeData, oldPath);
    if (!treeDataNode || !isValid(treeDataNode)) continue;

    pathRemappings.set(oldPath, newPath);

    // For nodes in the tree, also check via parentId (more precise than
    // segment counting for edge cases).
    if (isFileTreeNodeTopLevel(treeDataNode)) {
      needsTopLevelInvalidation = true;
    }

    const newName = newSegments[newSegments.length - 1];
    const oldParentId = treeDataNode.parentId;
    const newParentId =
      getParentNodeFromPath(fileTreeData, newPath)?.id ?? null;

    nodeUpdates.set(treeDataNode.id, {
      path: newPath,
      name: newName,
      parentId: newParentId,
    });

    if (oldParentId && oldParentId !== newParentId) {
      // Moving to a different parent — remove from old parent
      const oldParentUpdate = parentFolderUpdates.get(oldParentId) ?? {
        removeChildIds: new Set<string>(),
        addChildIds: new Set<string>(),
        originalLastChildName: getOriginalLastChildName(
          fileTreeData,
          oldParentId
        ),
      };
      oldParentUpdate.removeChildIds.add(treeDataNode.id);
      parentFolderUpdates.set(oldParentId, oldParentUpdate);
    }

    if (newParentId) {
      const newParentUpdate = parentFolderUpdates.get(newParentId) ?? {
        removeChildIds: new Set<string>(),
        addChildIds: new Set<string>(),
        originalLastChildName: getOriginalLastChildName(
          fileTreeData,
          newParentId
        ),
      };
      if (newParentId !== oldParentId) {
        // Moving to a different parent — add to new parent
        newParentUpdate.addChildIds.add(treeDataNode.id);
      }
      // Same parent: the entry still exists so applyParentFolderUpdates
      // will re-sort and check pagination boundaries.
      parentFolderUpdates.set(newParentId, newParentUpdate);
    }
  }

  return {
    pathRemappings,
    nodeUpdates,
    parentFolderUpdates,
    needsTopLevelInvalidation,
  };
}

/**
 * Applies old->new path remappings to the file tree data.
 *
 * In 'folder' mode, updates the entire subtree (the folder and all descendants)
 * so that paths like `old/sub/file.md` become `new/sub/file.md`.
 *
 * In 'file' mode, updates only the file entry. If the new path collides with an
 * existing different node, the duplicate is removed first.
 */
export function applyPathRemappings({
  fileTreeData,
  pathRemappings,
  mode,
}: {
  fileTreeData: FileTreeData;
  pathRemappings: Map<string, string>;
  mode: 'file' | 'folder';
}): FileTreeData {
  const newFilePathToTreeDataId = new Map(fileTreeData.filePathToTreeDataId);
  let updatedTreeData = new Map(fileTreeData.treeData);

  if (mode === 'folder') {
    for (const [oldFolderPath, newFolderPath] of pathRemappings) {
      const entriesToUpdate: [string, string][] = [];

      for (const [path, id] of newFilePathToTreeDataId.entries()) {
        if (path === oldFolderPath || path.startsWith(oldFolderPath + '/')) {
          entriesToUpdate.push([path, id]);
        }
      }

      for (const [oldPath, id] of entriesToUpdate) {
        newFilePathToTreeDataId.delete(oldPath);
        const newPath =
          oldPath === oldFolderPath
            ? newFolderPath
            : newFolderPath + oldPath.slice(oldFolderPath.length);
        newFilePathToTreeDataId.set(newPath, id);

        const node = updatedTreeData.get(id);
        if (!node) continue;
        updatedTreeData.set(id, {
          ...node,
          path: newPath,
        });
      }
    }

    return {
      treeData: updatedTreeData,
      filePathToTreeDataId: newFilePathToTreeDataId,
    };
  }

  for (const [oldPath, newPath] of pathRemappings) {
    const fileId = fileTreeData.filePathToTreeDataId.get(oldPath);
    if (!fileId) {
      continue;
    }

    const existingIdForNewPath = fileTreeData.filePathToTreeDataId.get(newPath);
    if (existingIdForNewPath && existingIdForNewPath !== fileId) {
      const duplicateNode = updatedTreeData.get(existingIdForNewPath);
      if (duplicateNode && isTreeNodeAFile(duplicateNode)) {
        if (duplicateNode.parentId) {
          updatedTreeData = removeFileFromFileTreeMap({
            map: updatedTreeData,
            fileId: existingIdForNewPath,
            parentId: duplicateNode.parentId,
          });
        } else {
          updatedTreeData.delete(existingIdForNewPath);
        }
      }
      newFilePathToTreeDataId.delete(newPath);
    }

    newFilePathToTreeDataId.delete(oldPath);
    newFilePathToTreeDataId.set(newPath, fileId);
  }

  return {
    treeData: updatedTreeData,
    filePathToTreeDataId: newFilePathToTreeDataId,
  };
}

/**
 * Applies per-node updates (path, name, parentId) to the tree data.
 * Optionally restricts updates to a specific node type so that e.g.
 * a folder rename doesn't accidentally modify file nodes with the same ID.
 */
export function applyNodeUpdates({
  treeData,
  nodeUpdates,
  expectedType,
}: {
  treeData: Map<string, FileOrFolder>;
  nodeUpdates: Map<string, NodeUpdate>;
  expectedType?: FileOrFolder['type'];
}): Map<string, FileOrFolder> {
  const updatedTreeData = new Map(treeData);

  for (const [nodeId, updates] of nodeUpdates) {
    const existingNode = updatedTreeData.get(nodeId);
    if (!existingNode) continue;
    if (expectedType && existingNode.type !== expectedType) {
      continue;
    }
    updatedTreeData.set(nodeId, {
      ...existingNode,
      path: updates.path,
      name: updates.name,
      parentId: updates.parentId,
    });
  }

  return updatedTreeData;
}

/**
 * Recursively removes a node and all its descendants from standalone maps.
 */
function removeSubtreeFromMaps(
  treeData: Map<string, FileOrFolder>,
  filePathToTreeDataId: Map<string, string>,
  nodeId: string
): void {
  const node = treeData.get(nodeId);
  if (!node) return;

  if (isTreeNodeAFolder(node)) {
    for (const childId of node.childrenIds) {
      removeSubtreeFromMaps(treeData, filePathToTreeDataId, childId);
    }
  }

  filePathToTreeDataId.delete(node.path);
  treeData.delete(nodeId);
}

/**
 * Updates parent folders' children lists for moved/renamed nodes, re-sorting
 * by name and enforcing pagination boundaries.
 *
 * Pagination boundary logic:
 * Each `ParentFolderUpdate` carries `originalLastChildName` — the name of the
 * parent's last loaded child *before* any renames. After adding new children
 * and re-sorting, any child whose name sorts at or after that boundary is
 * removed from the tree entirely (it will appear when the user scrolls to
 * the next page). This prevents duplicates when the backend re-fetches the
 * same node in a later page.
 *
 * This boundary check applies to both:
 * - Cross-parent moves (node added to a new parent via `addChildIds`)
 * - Same-parent renames (node stays but its new name may push it past the boundary)
 */
export function applyParentFolderUpdates({
  treeData,
  filePathToTreeDataId,
  parentFolderUpdates,
}: {
  treeData: Map<string, FileOrFolder>;
  filePathToTreeDataId: Map<string, string>;
  parentFolderUpdates: Map<string, ParentFolderUpdate>;
}): FileTreeData {
  const updatedTreeData = new Map(treeData);
  const updatedFilePathToTreeDataId = new Map(filePathToTreeDataId);

  for (const [parentId, updates] of parentFolderUpdates) {
    const parent = updatedTreeData.get(parentId);
    if (!parent || !isTreeNodeAFolder(parent)) {
      continue;
    }

    // 1. Remove children that moved to a different parent
    let updatedChildrenIds = [...parent.childrenIds];
    for (const childId of updates.removeChildIds) {
      updatedChildrenIds = updatedChildrenIds.filter((id) => id !== childId);
    }

    // 2. Add children that moved into this parent (cross-parent moves)
    for (const childId of updates.addChildIds) {
      if (!updatedChildrenIds.includes(childId)) {
        updatedChildrenIds.push(childId);
      }
    }

    // 3. Re-sort by the (now-updated) names
    updatedChildrenIds.sort((a, b) => {
      const aItem = updatedTreeData.get(a);
      const bItem = updatedTreeData.get(b);
      const aName = aItem?.name ?? a;
      const bName = bItem?.name ?? b;
      return aName.localeCompare(bName);
    });

    // 4. Pagination boundary enforcement
    //    If the parent has more children beyond the loaded page, trim any
    //    children whose name now sorts at or after the original boundary.
    //    This handles both same-parent renames (node name changed) and
    //    cross-parent adds (new node inserted) that land beyond the page.
    if (
      parent.hasMoreChildren &&
      updates.originalLastChildName !== null &&
      updatedChildrenIds.length > 0
    ) {
      // Find the first child that sorts strictly after the boundary.
      // Children whose name equals the boundary are still within the loaded
      // page (the boundary *is* the last loaded item's original name).
      const boundaryIndex = updatedChildrenIds.findIndex((childId) => {
        const child = updatedTreeData.get(childId);
        if (!child) return false;
        return child.name.localeCompare(updates.originalLastChildName!) > 0;
      });

      if (boundaryIndex !== -1) {
        // Remove all children from the boundary onwards
        const overflow = updatedChildrenIds.slice(boundaryIndex);
        for (const overflowId of overflow) {
          removeSubtreeFromMaps(
            updatedTreeData,
            updatedFilePathToTreeDataId,
            overflowId
          );
        }
        updatedChildrenIds = updatedChildrenIds.slice(0, boundaryIndex);
      }
    }

    updatedTreeData.set(parentId, {
      ...parent,
      childrenIds: updatedChildrenIds,
    });
  }

  return {
    treeData: updatedTreeData,
    filePathToTreeDataId: updatedFilePathToTreeDataId,
  };
}
