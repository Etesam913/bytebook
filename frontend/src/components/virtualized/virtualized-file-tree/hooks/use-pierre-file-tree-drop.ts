import { useEffect } from 'react';
import type { FileTree as PierreFileTree } from '@pierre/trees';
import { useWailsEvent } from '@hooks/events';
import { useAddDroppedFilesToFolderMutation } from '@hooks/tree-items';
import { installWailsDragHandlers } from '@hooks/wails-drag';
import { EDITOR_CONTENT_DROP, FILE_TREE_CONTENT_DROP } from '@utils/events';
import {
  clearDropTargetHighlight,
  resolveDropTargetFolder,
  updateDropTargetHighlight,
} from '../model-utils';

/**
 * Subscribes to external OS file drop events over the file tree, resolves
 * the target folder path inside the shadow DOM, drives drop target highlights,
 * and executes the copy mutation.
 */
export function usePierreFileTreeDrop(model: PierreFileTree | null) {
  const { mutate: addDroppedFilesToFolder } =
    useAddDroppedFilesToFolderMutation();

  useEffect(() => {
    function cleanup() {
      clearDropTargetHighlight(model);
      setTimeout(() => clearDropTargetHighlight(model), 50);
      setTimeout(() => clearDropTargetHighlight(model), 150);
    }

    const restoreWailsHooks = installWailsDragHandlers({
      onDragOver: (x, y) => {
        updateDropTargetHighlight({ model, x, y });
      },
      onDragLeave: () => {
        cleanup();
      },
      onPlatformFileDrop: () => {
        cleanup();
      },
    });

    window.addEventListener('drop', cleanup, true);
    window.addEventListener('dragend', cleanup, true);
    window.addEventListener('mouseup', cleanup, true);

    return () => {
      restoreWailsHooks?.();
      window.removeEventListener('drop', cleanup, true);
      window.removeEventListener('dragend', cleanup, true);
      window.removeEventListener('mouseup', cleanup, true);
      clearDropTargetHighlight(model);
    };
  }, [model]);

  useWailsEvent(EDITOR_CONTENT_DROP, () => {
    clearDropTargetHighlight(model);
    setTimeout(() => clearDropTargetHighlight(model), 50);
  });

  useWailsEvent(FILE_TREE_CONTENT_DROP, (event) => {
    clearDropTargetHighlight(model);
    setTimeout(() => clearDropTargetHighlight(model), 50);

    const droppedFiles = event.data.droppedFiles;
    if (!droppedFiles || droppedFiles.length === 0) return;

    const destinationFolder = resolveDropTargetFolder({
      model,
      x: event.data.x,
      y: event.data.y,
    });

    addDroppedFilesToFolder({
      folderPath: destinationFolder,
      filePaths: droppedFiles,
    });
  });
}
