import { useAtomValue, useSetAtom } from 'jotai';
import {
  activeDropTargetIdAtom,
  dragHighlightIdsAtom,
  type FileTreeData,
  fileTreeDataAtom,
} from '../../../../atoms';
import { useWailsEvent } from '../../../../hooks/events';
import { FILE_TREE_CONTENT_DROP } from '../../../../utils/events';
import { isTreeNodeAFile, isTreeNodeAFolder } from '../utils/file-tree-utils';
import { useAddDroppedFilesToFolderMutation } from './tree-item-mutations';

type FileTreeContentDropEventData = {
  droppedFiles?: string[];
  targetElementId?: string;
};

const NOTES_ROOT_FOLDER = '';

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
    return NOTES_ROOT_FOLDER;
  }

  const parentNode = fileTreeData.treeData.get(targetNode.parentId);
  if (!parentNode || !isTreeNodeAFolder(parentNode)) {
    return null;
  }

  return parentNode.path;
}

/**
 * Listens for external file drops over file-tree targets and copies dropped files
 * into the resolved destination folder. Also clears drag highlight state once the
 * backend confirms the drop — the `handlePlatformFileDrop` hover-state cleanup
 * can miss if a late `handleDragOver` from the runtime arrives after the drop.
 */
export function useFileTreeContentDrop() {
  const fileTreeData = useAtomValue(fileTreeDataAtom);
  const setActiveDropTargetId = useSetAtom(activeDropTargetIdAtom);
  const setDragHighlightIds = useSetAtom(dragHighlightIdsAtom);
  const { mutate: addDroppedFilesToFolder } =
    useAddDroppedFilesToFolderMutation();

  useWailsEvent(FILE_TREE_CONTENT_DROP, (event) => {
    const data = event.data as FileTreeContentDropEventData;
    const droppedFiles = data.droppedFiles ?? [];

    setActiveDropTargetId(null);
    setDragHighlightIds(new Set());

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
