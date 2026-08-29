import { useEffect, useState, type DragEvent, type RefObject } from 'react';
import { useAtomValue } from 'jotai';
import { draggedGhostElementAtom } from '@/atoms';
import { FILE_TREE_GHOST_ID } from '@components/editor/utils/drag/context';
import { useMoveTreeItemsMutation } from '@components/virtualized/virtualized-file-tree/hooks/tree-item-mutations';
import { useWailsEvent } from '@hooks/events';
import { useAddDroppedFilesToFolderMutation } from '@hooks/tree-items';
import { installWailsDragHandlers } from '@hooks/wails-drag';
import { FOLDER_CONTENT_DROP } from '@utils/events';
import type { FolderPath } from '@utils/path';
import { isPointInsideElement, resolveFolderDrop } from '../drop';

/**
 * Makes the whole folder view a drop target: OS files arrive through the
 * Wails native drag globals + `FOLDER_CONTENT_DROP`, sidebar items through
 * regular DOM drag events. `isDropActive` drives the full-surface overlay.
 */
export function useFolderRendererDrop({
  folderPath,
  containerRef,
}: {
  folderPath: FolderPath;
  containerRef: RefObject<HTMLElement | null>;
}) {
  const { mutate: addDroppedFilesToFolder } =
    useAddDroppedFilesToFolderMutation();
  const { mutate: moveItems } = useMoveTreeItemsMutation();
  const draggedGhostElement = useAtomValue(draggedGhostElementAtom);
  const isFileTreeDrag = draggedGhostElement?.id === FILE_TREE_GHOST_ID;
  const [isDropActive, setIsDropActive] = useState(false);

  useEffect(() => {
    function clearHighlight() {
      setIsDropActive(false);
    }

    const restoreWailsHooks = installWailsDragHandlers({
      onDragOver: (x, y) => {
        const container = containerRef.current;
        if (!container) return;
        setIsDropActive(isPointInsideElement({ element: container, x, y }));
      },
      onDragLeave: clearHighlight,
      onPlatformFileDrop: clearHighlight,
    });

    window.addEventListener('drop', clearHighlight, true);
    window.addEventListener('dragend', clearHighlight, true);
    window.addEventListener('mouseup', clearHighlight, true);

    return () => {
      restoreWailsHooks?.();
      window.removeEventListener('drop', clearHighlight, true);
      window.removeEventListener('dragend', clearHighlight, true);
      window.removeEventListener('mouseup', clearHighlight, true);
    };
  }, [containerRef]);

  useWailsEvent(FOLDER_CONTENT_DROP, (event) => {
    setIsDropActive(false);
    const droppedFiles = event.data.droppedFiles;
    if (!droppedFiles || droppedFiles.length === 0) return;
    addDroppedFilesToFolder({
      folderPath: folderPath.fullPath,
      filePaths: droppedFiles,
    });
  });

  function handleDragOver(e: DragEvent<HTMLElement>) {
    if (!isFileTreeDrag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDropActive(true);
  }

  function handleDragLeave(e: DragEvent<HTMLElement>) {
    // Moving between children fires leave/enter pairs; only clear on exit.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDropActive(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLElement>) {
    setIsDropActive(false);
    const action = resolveFolderDrop({
      dataTransfer: e.dataTransfer,
      isFileTreeDrag,
    });
    if (!action) return;
    e.preventDefault();
    moveItems({ itemPaths: action.itemPaths, newFolder: folderPath.fullPath });
  }

  return {
    isDropActive,
    dragProps: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
