import { useAtomValue } from 'jotai';
import { type FileTreeData, fileTreeDataAtom } from '../../../../atoms';
import { useWailsEvent } from '../../../../hooks/events';
import { FILE_TREE_CONTENT_DROP } from '../../../../utils/events';
import { isTreeNodeAFile, isTreeNodeAFolder } from '../utils/file-tree-utils';
import { useAddDroppedFilesToFolderMutation } from './tree-item-mutations';

type FileTreeContentDropEventData = {
  droppedFiles?: string[];
  targetElementId?: string;
};

function resolveTargetFolderPath(
  fileTreeData: FileTreeData,
  targetElementId: string | undefined
): string | null {
  if (!targetElementId) {
    return null;
  }

  const targetNode = fileTreeData.treeData.get(targetElementId);
  if (!targetNode) {
    return null;
  }

  if (isTreeNodeAFolder(targetNode)) {
    return targetNode.path;
  }

  if (!isTreeNodeAFile(targetNode)) {
    return null;
  }

  if (!targetNode.parentId) {
    // Top-level files are dropped into the root notes directory.
    return '';
  }

  const parentNode = fileTreeData.treeData.get(targetNode.parentId);
  if (!parentNode || !isTreeNodeAFolder(parentNode)) {
    return null;
  }

  return parentNode.path;
}

/**
 * Listens for external file drops over file-tree targets and copies dropped files
 * into the resolved destination folder.
 */
export function useFileTreeContentDrop() {
  const fileTreeData = useAtomValue(fileTreeDataAtom);
  const { mutate: addDroppedFilesToFolder } =
    useAddDroppedFilesToFolderMutation();

  useWailsEvent(FILE_TREE_CONTENT_DROP, (event) => {
    const data = event.data as FileTreeContentDropEventData;
    const droppedFiles = data.droppedFiles ?? [];
    if (droppedFiles.length === 0) {
      return;
    }

    const targetFolderPath = resolveTargetFolderPath(
      fileTreeData,
      data.targetElementId
    );
    if (targetFolderPath === null) {
      return;
    }

    addDroppedFilesToFolder({
      folderPath: targetFolderPath,
      filePaths: droppedFiles,
    });
  });
}
