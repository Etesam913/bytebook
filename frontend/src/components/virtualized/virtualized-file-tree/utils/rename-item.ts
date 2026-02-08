import type { FileOrFolder } from '../types';
import type { FileTreeData } from '..';
import {
  getTreeNodeFromPath,
  removeFileFromFileTreeMap,
} from './file-tree-utils';

type NodeUpdate = {
  path: string;
  name: string;
  parentId: string | null;
};

type ParentFolderUpdate = {
  removeChildIds: Set<string>;
  addChildIds: Set<string>;
};

type RenameUpdates = {
  pathRemappings: Map<string, string>;
  nodeUpdates: Map<string, NodeUpdate>;
  parentFolderUpdates: Map<string, ParentFolderUpdate>;
  needsTopLevelInvalidation: boolean;
};

type RenameEntry = {
  oldPath: string;
  newPath: string;
};

type BuildRenameUpdatesOptions = {
  entries: RenameEntry[];
  fileTreeData: FileTreeData;
  isValidNode?: (node: FileOrFolder) => boolean;
  onMissingNode?: (oldPath: string) => void;
  onBeforeUpdate?: (
    node: FileOrFolder,
    newPath: string
  ) => Promise<void> | void;
};

/**
 * Builds rename metadata by resolving tree nodes, tracking path remaps, and
 * recording parent-child updates required to keep folder children ordered.
 */
export async function buildRenameUpdates({
  entries,
  fileTreeData,
  isValidNode,
  onMissingNode,
  onBeforeUpdate,
}: BuildRenameUpdatesOptions): Promise<RenameUpdates> {
  const pathRemappings = new Map<string, string>();
  const nodeUpdates = new Map<string, NodeUpdate>();
  const parentFolderUpdates = new Map<string, ParentFolderUpdate>();
  let needsTopLevelInvalidation = false;

  const isValid = isValidNode ?? (() => true);

  for (const { oldPath, newPath } of entries) {
    const treeDataNode = getTreeNodeFromPath(fileTreeData, oldPath);
    if (!treeDataNode || !isValid(treeDataNode)) {
      if (onMissingNode) onMissingNode(oldPath);
      continue;
    }

    if (onBeforeUpdate) {
      await onBeforeUpdate(treeDataNode, newPath);
    }

    const oldSegments = oldPath.split('/').filter(Boolean);
    const newSegments = newPath.split('/').filter(Boolean);
    pathRemappings.set(oldPath, newPath);

    const isUpdatingTopLevel =
      oldSegments.length === 1 || newSegments.length === 1;
    if (isUpdatingTopLevel) {
      needsTopLevelInvalidation = true;
    }

    const newName = newSegments[newSegments.length - 1];
    const oldParentId = treeDataNode.parentId;
    const newParentPath = newSegments.slice(0, -1).join('/');
    const newParentId =
      getTreeNodeFromPath(fileTreeData, newParentPath)?.id ?? null;

    nodeUpdates.set(treeDataNode.id, {
      path: newPath,
      name: newName,
      parentId: newParentId,
    });

    if (oldParentId && oldParentId !== newParentId) {
      const parentUpdate = parentFolderUpdates.get(oldParentId) ?? {
        removeChildIds: new Set<string>(),
        addChildIds: new Set<string>(),
      };
      parentUpdate.removeChildIds.add(treeDataNode.id);
      parentFolderUpdates.set(oldParentId, parentUpdate);
    }

    if (newParentId && newParentId !== oldParentId) {
      const parentUpdate = parentFolderUpdates.get(newParentId) ?? {
        removeChildIds: new Set<string>(),
        addChildIds: new Set<string>(),
      };
      parentUpdate.addChildIds.add(treeDataNode.id);
      parentFolderUpdates.set(newParentId, parentUpdate);
    }
  }

  console.log({
    pathRemappings,
    nodeUpdates,
    parentFolderUpdates,
    needsTopLevelInvalidation,
  });

  return {
    pathRemappings,
    nodeUpdates,
    parentFolderUpdates,
    needsTopLevelInvalidation,
  };
}

/**
 * Applies old->new path remappings to the file tree data.
 * For folders, this updates the entire subtree; for files, it updates only the file
 * and handles duplicate file paths safely.
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
      if (duplicateNode && duplicateNode.type === 'file') {
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
 * Optionally restricts updates to a specific node type.
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
 * Updates parent folders' children lists for moved nodes, re-sorting by name.
 */
export function applyParentFolderUpdates({
  treeData,
  parentFolderUpdates,
}: {
  treeData: Map<string, FileOrFolder>;
  parentFolderUpdates: Map<string, ParentFolderUpdate>;
}): Map<string, FileOrFolder> {
  const updatedTreeData = new Map(treeData);

  for (const [parentId, updates] of parentFolderUpdates) {
    const parent = updatedTreeData.get(parentId);
    if (!parent || parent.type !== 'folder') {
      continue;
    }

    let updatedChildrenIds = [...parent.childrenIds];
    for (const childId of updates.removeChildIds) {
      updatedChildrenIds = updatedChildrenIds.filter((id) => id !== childId);
    }

    for (const childId of updates.addChildIds) {
      if (!updatedChildrenIds.includes(childId)) {
        updatedChildrenIds.push(childId);
      }
    }

    updatedChildrenIds.sort((a, b) => {
      const aItem = updatedTreeData.get(a);
      const bItem = updatedTreeData.get(b);
      const aName = aItem?.name ?? a;
      const bName = bItem?.name ?? b;
      return aName.localeCompare(bName);
    });

    updatedTreeData.set(parentId, {
      ...parent,
      childrenIds: updatedChildrenIds,
    });
  }

  return updatedTreeData;
}
