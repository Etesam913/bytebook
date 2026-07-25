import type { FileTreeData, ReadonlyFileTreeData } from '../../../../atoms';
import { FOLDER_TYPE } from '../types';

// Creates a writable snapshot while preserving the node objects themselves.
export function cloneFileTreeData(data: ReadonlyFileTreeData): FileTreeData {
  return {
    treeData: new Map(data.treeData),
    filePathToTreeDataId: new Map(data.filePathToTreeDataId),
  };
}

// Removes a node and every loaded descendant from both file-tree indexes.
export function removeSubtree(
  data: FileTreeData,
  nodeId: string,
  removedIds?: Set<string>
): void {
  const node = data.treeData.get(nodeId);
  if (!node) return;

  if (node.type === FOLDER_TYPE) {
    for (const childId of node.childrenIds) {
      removeSubtree(data, childId, removedIds);
    }
  }

  data.treeData.delete(nodeId);
  data.filePathToTreeDataId.delete(node.path);
  removedIds?.add(nodeId);
}
