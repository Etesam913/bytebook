import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { MouseEvent, useState, useEffect, useRef, DragEvent } from 'react';
import { navigate } from 'wouter/use-browser-location';
import {
  activeDropTargetIdAtom,
  contextMenuDataAtom,
  dragHighlightIdsAtom,
  projectSettingsAtom,
  sidebarSelectionAtom,
  type SidebarSelectionState,
} from '../../../../atoms';
import { isTreeNodeAFile, isTreeNodeAFolder } from '../utils/file-tree-utils';
import { useFilePathFromRoute } from '../../../../hooks/routes';
import { createFilePath } from '../../../../utils/path';
import { cn } from '../../../../utils/string-formatting';
import type { FlattenedFileOrFolder } from '../types';
import { InlineTreeItemInput } from './inline-tree-item-input';
import {
  useMoveTreeItemsMutation,
  useRenameTreeItemMutation,
} from '../hooks/tree-item-mutations';
import {
  getDragHighlightIds,
  getFileTreeItemIndent,
  isItemAlreadyInDropDestination,
} from '../utils/file-tree-utils';
import { getContextMenuSelectionItems } from '../utils/item-selection';
import { handleFileTreeDragEnd, handleFileTreeDragStart } from '../utils/drag';
import { draggedGhostElementAtom } from '../../../editor/atoms';
import { getSelectionValue } from '../../../../utils/selection';
import { fileTreeDataAtom } from '../../../../atoms';
import { useContextMenuItems } from '../../../context-menu/items';
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
  const [contextMenuData, setContextMenuData] = useAtom(contextMenuDataAtom);
  const [activeDropTargetId, setActiveDropTargetId] = useAtom(
    activeDropTargetIdAtom
  );
  const dragHighlightIds = useAtomValue(dragHighlightIdsAtom);
  const setDragHighlightIds = useSetAtom(dragHighlightIdsAtom);
  const sidebarSelection = useAtomValue(sidebarSelectionAtom);
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const setDraggedGhostElement = useSetAtom(draggedGhostElementAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const [isEditing, setIsEditing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Tracks whether the rename input was previously active so focus can return to the row button.
  const wasEditingRef = useRef(false);

  useEffect(() => {
    if (wasEditingRef.current && !isEditing) {
      buttonRef.current?.focus();
    }
    wasEditingRef.current = isEditing;
  }, [isEditing]);

  const { revealInFinder, pin, editTags, rename, moveToTrash } =
    useContextMenuItems();
  const {
    mutate: renameTreeItem,
    error: renameTreeItemError,
    reset: resetRenameTreeItem,
  } = useRenameTreeItemMutation();
  const { mutateAsync: moveItemsToFolder } = useMoveTreeItemsMutation();

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

  // Get the parent folder path for drop target resolution
  const parentFolder = dataItem.parentId
    ? fileOrFolderMap.get(dataItem.parentId)
    : null;
  const parentFolderPath =
    parentFolder && isTreeNodeAFolder(parentFolder) ? parentFolder.path : '';

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
  const hasDragHighlight = dragHighlightIds.has(dataItem.id);
  // Mute the dragged selection while another row is acting as the active drop target.
  // Skip muting when the drop would leave this item in its current folder (no-op).
  const shouldMuteSelection =
    activeDropTargetId !== null &&
    activeDropTargetId !== dataItem.id &&
    isSelectedFromSidebarClick &&
    !isItemAlreadyInDropDestination({
      fileOrFolderMap,
      itemParentId: dataItem.parentId,
      dropTargetId: activeDropTargetId,
    });
  const isContextMenuTarget =
    contextMenuData.isShowing && contextMenuData.targetId === dataItem.id;
  const innerContent = (
    <span
      style={{ paddingLeft }}
      className={cn(
        'rounded-md flex items-center gap-2 py-1 pr-2 overflow-hidden w-full hover:bg-zinc-100 dark:hover:bg-zinc-650 focus:bg-zinc-100 dark:focus:bg-zinc-650',
        !hasDragHighlight &&
          !shouldMuteSelection &&
          isSelectedFromRoute &&
          'bg-zinc-150 dark:bg-zinc-600 text-(--accent-color)',
        !hasDragHighlight &&
          !shouldMuteSelection &&
          isSelectedFromSidebarClick &&
          'bg-(--accent-color)! text-white!',
        shouldMuteSelection &&
          'bg-zinc-200 text-zinc-500 hover:bg-zinc-200 focus:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:focus:bg-zinc-700',
        hasDragHighlight &&
          'bg-(--accent-color)/25 hover:bg-(--accent-color)/25 dark:hover:bg-(--accent-color)/25 focus:bg-(--accent-color)/25 dark:focus:bg-(--accent-color)/25'
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

    handleFileTreeDragStart({
      e,
      sidebarSelection: newSelectionState,
      fileOrFolderMap,
      setDraggedGhostElement,
    });
  }

  function handleDragEnd(e: DragEvent) {
    handleFileTreeDragEnd({
      e,
      setDraggedGhostElement,
      setSidebarSelection,
    });
    setActiveDropTargetId(null);
    setDragHighlightIds(new Set());
  }

  return (
    <button
      ref={buttonRef}
      role="treeitem"
      aria-level={dataItem.level + 1}
      aria-selected={isSelectedFromSidebarClick || isSelectedFromRoute}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragEnter={() => {
        setActiveDropTargetId(dataItem.id);
        const allAreSiblings = [...sidebarSelection.selections].every(
          (selectionKey) => {
            const itemId = getSelectionValue(selectionKey);
            if (!itemId) return false;
            const item = fileOrFolderMap.get(itemId);
            return item?.parentId === dataItem.parentId;
          }
        );

        setDragHighlightIds(
          allAreSiblings
            ? new Set()
            : getDragHighlightIds({
                fileOrFolderMap,
                parentId: dataItem.parentId,
              })
        );
      }}
      onDragOver={(e) => {
        e.stopPropagation();
        const dropWouldMoveSomething = [...sidebarSelection.selections].some(
          // Only the case when the element that is selected is not the sibling of this target file
          (selectionKey) => {
            const itemId = getSelectionValue(selectionKey);
            if (!itemId) return false;
            const item = fileOrFolderMap.get(itemId);
            return item != null && item.parentId !== dataItem.parentId;
          }
        );
        if (dropWouldMoveSomething) {
          // Prevent drag over allow for drop event to happen later
          e.preventDefault();
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveDropTargetId((currentId) =>
          currentId === dataItem.id ? null : currentId
        );
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveDropTargetId(null);
        setDragHighlightIds(new Set());
        void moveItemsToFolder(parentFolderPath);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          enterEditMode();
        }
      }}
      onClick={handleClick}
      data-file-drop-target
      id={dataItem.id}
      onContextMenu={(e) => {
        e.preventDefault();
        const { selectedItems } = getContextMenuSelectionItems({
          currentItem: dataItem,
          sidebarSelections: sidebarSelection.selections,
          fileOrFolderMap,
        });
        const selectedFiles = selectedItems.filter((item) =>
          isTreeNodeAFile(item)
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
        const hasFolderSelection = selectedItems.some((item) =>
          isTreeNodeAFolder(item)
        );
        const isMultiSelection = selectedItems.length > 1;
        const shouldPinSelectedFiles = selectedFiles.some(
          (item) => !projectSettings.pinnedNotes.has(item.path)
        );

        const firstSelectedFilePath =
          !isMultiSelection && selectedFilePaths[0]
            ? selectedFilePaths[0]
            : null;

        setContextMenuData({
          x: e.clientX,
          y: e.clientY,
          isShowing: true,
          targetId: dataItem.id,
          items: [
            ...(firstSelectedFilePath
              ? [revealInFinder({ path: firstSelectedFilePath })]
              : []),
            ...(!hasFolderSelection && selectedFiles.length > 0
              ? [
                  pin({
                    paths: selectedFiles.map((item) => item.path),
                    shouldPin: shouldPinSelectedFiles,
                    kind: 'note',
                  }),
                ]
              : []),
            ...(!hasFolderSelection &&
            selectedFilePaths.length > 0 &&
            selectedFolderForTags !== null
              ? [
                  editTags({
                    folder: selectedFolderForTags,
                    selectionRange: new Set(
                      selectedFilePaths.map((path) => `note:${path.note}`)
                    ),
                  }),
                ]
              : []),
            ...(!isMultiSelection ? [rename({ onRename: enterEditMode })] : []),
            moveToTrash({
              paths: selectedItems.map((item) => item.path),
            }),
          ],
        });
      }}
      className={cn(
        'flex items-center w-full relative rounded-md py-0.25 focus:outline-2 focus:outline-(--accent-color) focus:-outline-offset-2',
        isContextMenuTarget &&
          'outline-2 outline-(--accent-color) -outline-offset-2'
      )}
    >
      {innerContent}
    </button>
  );
}
