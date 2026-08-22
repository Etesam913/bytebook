import type { FileTree as PierreFileTree } from '@pierre/trees';
import { useWailsEvent } from '@hooks/events';
import { useAddDroppedFilesToFolderMutation } from '@hooks/tree-items';
import { FILE_TREE_CONTENT_DROP } from '@utils/events';
import { resolveDropTargetFolder } from '../model-utils';

/**
 * Subscribes to external OS file drop events over the file tree, resolves
 * the target folder path inside the shadow DOM, and executes the copy mutation.
 */
export function usePierreFileTreeDrop(model: PierreFileTree | null) {
  const { mutate: addDroppedFilesToFolder } =
    useAddDroppedFilesToFolderMutation();

  useWailsEvent(FILE_TREE_CONTENT_DROP, (event) => {
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
