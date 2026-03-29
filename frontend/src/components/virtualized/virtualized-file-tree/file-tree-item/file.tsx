import { useAtomValue, useSetAtom } from 'jotai';
import { MouseEvent, useState, DragEvent } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { Finder } from '../../../../icons/finder';
import { PinTack2 } from '../../../../icons/pin-tack-2';
import { PinTackSlash } from '../../../../icons/pin-tack-slash';
import {
  contextMenuDataAtom,
  dialogDataAtom,
  projectSettingsAtom,
  sidebarSelectionAtom,
  type SidebarSelectionState,
} from '../../../../atoms';
import { useFilePathFromRoute } from '../../../../hooks/routes';
import {
  useMoveToTrashMutation,
  usePinPathMutation,
} from '../../../../hooks/notes';
import { useEditTagsFormMutation } from '../../../../hooks/tags';
import { useRevealInFinderMutation } from '../../../../hooks/code';
import { createFilePath } from '../../../../utils/path';
import { cn } from '../../../../utils/string-formatting';
import type { FlattenedFileOrFolder } from '../types';
import { InlineTreeItemInput } from './inline-tree-item-input';
import { Trash } from '../../../../icons/trash';
import { FilePen } from '../../../../icons/file-pen';
import { useRenameTreeItemMutation } from '../hooks/tree-item-mutations';
import { getFileTreeItemIndent } from '../utils/file-tree-utils';
import {
  createDragGhostElement,
  getContextMenuSelectionItems,
} from '../utils/item-selection';
import { fileTreeDataAtom } from '../../../../atoms';
import { TagPlus } from '../../../../icons/tag-plus';
import { EditTagDialogChildren } from '../../../../routes/notes-sidebar/edit-tag-dialog-children';
import { RenderNoteIcon } from '../../../../icons/render-note-icon';
import { FileBan } from '../../../../icons/file-ban';

export function FileTreeFileItem({
  dataItem,
  onSelectionClick,
  addItemToSidebarSelection,
  isSelectedFromSidebarClick,
}: {
  dataItem: FlattenedFileOrFolder;
  onSelectionClick: (e: MouseEvent) => void;
  addItemToSidebarSelection: () => SidebarSelectionState | null;
  isSelectedFromSidebarClick: boolean;
}) {
  const filePathFromRoute = useFilePathFromRoute();
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const setDialogData = useSetAtom(dialogDataAtom);
  const sidebarSelection = useAtomValue(sidebarSelectionAtom);
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const [isEditing, setIsEditing] = useState(false);

  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutation();
  const { mutate: pinPath } = usePinPathMutation();
  const { mutateAsync: editTags } = useEditTagsFormMutation();
  const {
    mutate: renameTreeItem,
    error: renameTreeItemError,
    reset: resetRenameTreeItem,
  } = useRenameTreeItemMutation();

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
  // Some project files can be extensionless. Render those rows without note navigation.

  const resolvedFilePath = filePath;

  const isSelectedFromRoute =
    filePath !== null &&
    filePathFromRoute !== null &&
    filePathFromRoute.equals(filePath);

  function handleClick(e: MouseEvent) {
    // Stop propagation for modifier clicks to prevent parent handlers from clearing selection
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.stopPropagation();
    }

    // For default click (no modifier keys), also navigate to the file
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey && resolvedFilePath) {
      navigate(resolvedFilePath.encodedFileUrl);
    }
    onSelectionClick(e);
  }

  const paddingLeft = getFileTreeItemIndent(dataItem.level);
  const innerContent = (
    <span
      style={{ paddingLeft }}
      className={cn(
        'rounded-md flex items-center gap-2 py-1 pr-2 overflow-hidden w-full hover:bg-zinc-100 dark:hover:bg-zinc-650 focus:bg-zinc-100 dark:focus:bg-zinc-650',
        isSelectedFromRoute &&
          'bg-zinc-150 dark:bg-zinc-600 text-(--accent-color)',
        isSelectedFromSidebarClick && 'bg-(--accent-color)! text-white!'
      )}
    >
      {filePath ? (
        <RenderNoteIcon filePath={filePath} size="sm" />
      ) : (
        <FileBan className="min-w-4 min-h-4" height="1rem" width="1rem" />
      )}
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
  );

  if (isEditing) {
    return (
      <div className="flex items-center w-full relative rounded-md py-0.25">
        {innerContent}
      </div>
    );
  }

  function handleDragStart(e: DragEvent) {
    const newSelectionState = addItemToSidebarSelection();
    if (!newSelectionState) return;

    const ghost = createDragGhostElement({
      sidebarSelection: newSelectionState,
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
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      data-file-drop-target
      id={dataItem.id}
      onContextMenu={(e) => {
        e.preventDefault();
        const newSelectionState = addItemToSidebarSelection();
        const contextMenuSelections =
          newSelectionState?.selections ?? sidebarSelection.selections;
        const { selectedItems } = getContextMenuSelectionItems({
          currentItem: dataItem,
          sidebarSelections: contextMenuSelections,
          fileOrFolderMap,
        });
        const selectedFiles = selectedItems.filter(
          (item) => item.type === 'file'
        );
        const selectedFilePaths = selectedFiles
          .map((item) => createFilePath(item.path))
          .filter((path): path is NonNullable<typeof path> => Boolean(path));
        const selectedFoldersForFiles = new Set(
          selectedFilePaths.map((path) => path.folder)
        );
        const selectedFolderForTags =
          selectedFoldersForFiles.size === 1 && selectedFilePaths[0]
            ? selectedFilePaths[0].folder
            : null;
        const hasFolderSelection = selectedItems.some(
          (item) => item.type === 'folder'
        );
        const isMultiSelection = selectedItems.length > 1;
        const shouldPinSelectedFiles = selectedFiles.some(
          (item) => !projectSettings.pinnedNotes.has(item.path)
        );

        setContextMenuData({
          x: e.clientX,
          y: e.clientY,
          isShowing: true,
          items: [
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Finder height="1.0625rem" width="1.0625rem" />{' '}
                  <span>Reveal in Finder</span>
                </span>
              ),
              value: 'reveal-in-finder',
              onChange: () => {
                selectedItems.forEach((item) => {
                  revealInFinder({
                    path: `notes/${item.path}`,
                    shouldPrefixWithProjectPath: true,
                  });
                });
              },
            },
            ...(!hasFolderSelection && selectedFiles.length > 0
              ? [
                  {
                    label: (
                      <span className="flex items-center gap-1.5">
                        {shouldPinSelectedFiles ? (
                          <PinTack2 height="1.0625rem" width="1.0625rem" />
                        ) : (
                          <PinTackSlash height="1.0625rem" width="1.0625rem" />
                        )}{' '}
                        <span>
                          {shouldPinSelectedFiles
                            ? selectedFiles.length > 1
                              ? 'Pin Notes'
                              : 'Pin Note'
                            : selectedFiles.length > 1
                              ? 'Unpin Notes'
                              : 'Unpin Note'}
                        </span>
                      </span>
                    ),
                    value: shouldPinSelectedFiles ? 'pin-note' : 'unpin-note',
                    onChange: () => {
                      selectedFiles.forEach((item) => {
                        pinPath({
                          path: item.path,
                          shouldPin: shouldPinSelectedFiles,
                        });
                      });
                    },
                  },
                ]
              : []),
            ...(!hasFolderSelection &&
            selectedFilePaths.length > 0 &&
            selectedFolderForTags !== null
              ? [
                  {
                    label: (
                      <span className="flex items-center gap-1.5">
                        <TagPlus height="1.0625rem" width="1.0625rem" />{' '}
                        <span>Edit Tags</span>
                      </span>
                    ),
                    value: 'edit-tags',
                    onChange: () => {
                      const selectionRange = new Set(
                        selectedFilePaths.map((path) => `note:${path.note}`)
                      );
                      setDialogData({
                        isOpen: true,
                        isPending: false,
                        title: 'Edit Tags',
                        dialogClassName: 'w-[min(30rem,90vw)]',
                        children: (errorText) => (
                          <EditTagDialogChildren
                            selectionRange={selectionRange}
                            folder={selectedFolderForTags}
                            errorText={errorText}
                          />
                        ),
                        onSubmit: async (e, setErrorText) => {
                          return await editTags({
                            e,
                            setErrorText,
                            selectionRange,
                            folder: selectedFolderForTags,
                          });
                        },
                      });
                    },
                  },
                ]
              : []),
            ...(!isMultiSelection
              ? [
                  {
                    label: (
                      <span className="flex items-center gap-1.5">
                        <FilePen height="1.0625rem" width="1.0625rem" />{' '}
                        <span>Rename</span>
                      </span>
                    ),
                    value: 'rename',
                    onChange: () => {
                      enterEditMode();
                    },
                  },
                ]
              : []),
            {
              value: 'move-to-trash',
              label: (
                <span className="flex items-center gap-1.5">
                  <Trash height="1.0625rem" width="1.0625rem" />{' '}
                  <span>Move to Trash</span>
                </span>
              ),
              onChange: () => {
                moveToTrash({ paths: selectedItems.map((item) => item.path) });
              },
            },
          ],
        });
      }}
      className="flex items-center w-full relative rounded-md py-0.25 focus:outline-2 focus:outline-(--accent-color) focus:-outline-offset-2"
    >
      {innerContent}
    </button>
  );
}
