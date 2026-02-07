import { useAtomValue, useSetAtom } from 'jotai';
import { MouseEvent, useState, DragEvent } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { Note } from '../../../../icons/page';
import { Finder } from '../../../../icons/finder';
import { contextMenuDataAtom } from '../../../../atoms';
import { useFilePathFromRoute } from '../../../../hooks/routes';
import { useMoveToTrashMutationNew } from '../../../../hooks/notes';
import { useRevealInFinderMutation } from '../../../../hooks/code';
import { currentZoomAtom } from '../../../../hooks/resize';
import { createFilePath } from '../../../../utils/path';
import { cn } from '../../../../utils/string-formatting';
import type { FlattenedFileOrFolder } from '../types';
import { InlineTreeItemInput } from './inline-tree-item-input';
import { Trash } from '../../../../icons/trash';
import { FilePen } from '../../../../icons/file-pen';
import { useRenameTreeItemMutation } from '../hooks';
import { getFileTreeItemIndent } from '../utils/file-tree-utils';
import { createDragGhostElement } from '../utils/item-selection';
import { sidebarSelectionAtom } from '../../../../hooks/selection';
import { fileTreeDataAtom } from '..';

export function FileTreeFileItem({
  dataItem,
  onSelectionClick,
  onContextMenuSelection,
  isSelectedFromSidebarClick,
}: {
  dataItem: FlattenedFileOrFolder;
  onSelectionClick: (e: MouseEvent) => void;
  onContextMenuSelection: () => void;
  isSelectedFromSidebarClick: boolean;
}) {
  const filePathFromRoute = useFilePathFromRoute();
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const currentZoom = useAtomValue(currentZoomAtom);
  const sidebarSelection = useAtomValue(sidebarSelectionAtom);
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const paddingLeft = getFileTreeItemIndent(dataItem.level, currentZoom);

  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutationNew();
  const {
    mutate: renameTreeItem,
    error: renameTreeItemError,
    reset: resetRenameTreeItem,
  } = useRenameTreeItemMutation();
  const [isEditing, setIsEditing] = useState(false);

  const lastDotIndex = dataItem.name.lastIndexOf('.');
  const nameWithoutExtension =
    lastDotIndex === -1 ? dataItem.name : dataItem.name.slice(0, lastDotIndex);
  const extension =
    lastDotIndex === -1 ? undefined : dataItem.name.slice(lastDotIndex + 1);

  function exitEditMode() {
    setIsEditing(false);
    resetRenameTreeItem();
  }

  function enterEditMode() {
    setIsEditing(true);
    resetRenameTreeItem();
  }

  function onRenameSave(newName: string) {
    const trimmedName = newName.trim();

    if (trimmedName === nameWithoutExtension) {
      exitEditMode();
      return;
    }

    if (!filePath) {
      exitEditMode();
      return;
    }

    renameTreeItem({
      itemType: 'file',
      filePath,
      newName: trimmedName,
      onSuccess: exitEditMode,
    });
  }

  // File path should be defined for files
  const filePath = createFilePath(dataItem.path);
  if (!filePath) {
    return null;
  }

  const resolvedFilePath = filePath;

  const isSelectedFromRoute =
    filePathFromRoute && filePathFromRoute.equals(filePath);

  function handleClick(e: MouseEvent) {
    // Stop propagation for modifier clicks to prevent parent handlers from clearing selection
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.stopPropagation();
    }

    // For default click (no modifier keys), also navigate to the file
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
      navigate(resolvedFilePath.encodedFileUrl);
    }
    onSelectionClick(e);
  }

  const innerContent = (
    <>
      <span
        style={{ paddingLeft: `${paddingLeft}px` }}
        className={cn(
          'rounded-md flex items-center gap-2 z-10 py-1 px-2 overflow-hidden w-full hover:bg-zinc-100 dark:hover:bg-zinc-650 focus:bg-zinc-100 dark:focus:bg-zinc-650',
          isSelectedFromRoute &&
            'bg-zinc-150 dark:bg-zinc-600 text-(--accent-color)',
          isSelectedFromSidebarClick && 'bg-(--accent-color)! text-white!'
        )}
      >
        <Note
          className="min-w-4 min-h-4 will-change-transform"
          height={16}
          width={16}
          strokeWidth={1.75}
        />
        <InlineTreeItemInput
          dataItem={dataItem}
          defaultValue={nameWithoutExtension}
          isEditing={isEditing}
          errorText={
            renameTreeItemError instanceof Error
              ? renameTreeItemError.message
              : renameTreeItemError
                ? 'An error occurred'
                : ''
          }
          exitEditMode={exitEditMode}
          onSave={onRenameSave}
          extension={extension}
        />
      </span>
    </>
  );

  if (isEditing) {
    return (
      <div className="flex items-center w-full relative rounded-md py-0.25">
        {innerContent}
      </div>
    );
  }

  function handleDragStart(e: DragEvent) {
    if (sidebarSelection.selections.size === 0) {
      e.preventDefault();
      return;
    }
    const ghost = createDragGhostElement({
      sidebarSelection,
      fileOrFolderMap,
    });
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
  }

  function handleDragEnd() {
    const ghost = document.getElementById('drag-ghost');
    if (ghost) {
      ghost.remove();
    }
  }

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenuSelection();

        setContextMenuData({
          x: e.clientX / currentZoom,
          y: e.clientY / currentZoom,
          isShowing: true,
          items: [
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Finder height={17} width={17} />{' '}
                  <span>Reveal in Finder</span>
                </span>
              ),
              value: 'reveal-in-finder',
              onChange: () => {
                revealInFinder({
                  path: `notes/${dataItem.path}`,
                  shouldPrefixWithProjectPath: true,
                });
              },
            },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <FilePen height={17} width={17} /> <span>Rename</span>
                </span>
              ),
              value: 'rename',
              onChange: () => {
                enterEditMode();
              },
            },
            {
              value: 'move-to-trash',
              label: (
                <span className="flex items-center gap-1.5">
                  <Trash height={17} width={17} /> <span>Move to Trash</span>
                </span>
              ),
              onChange: () => {
                moveToTrash({ path: dataItem.path });
              },
            },
          ],
        });
      }}
      className="flex items-center w-full relative rounded-md py-0.25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent-color)] focus-visible:outline-offset-2"
    >
      {innerContent}
    </button>
  );
}
