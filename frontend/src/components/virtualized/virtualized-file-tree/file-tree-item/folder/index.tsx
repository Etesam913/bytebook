import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { MouseEvent, DragEvent, useState, useEffect, useRef } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { Folder as FolderIcon } from '../../../../../icons/folder';
import { FolderOpen } from '../../../../../icons/folder-open';
import { FolderPen } from '../../../../../icons/folder-pen';
import { Blog } from '../../../../../icons/blog';
import { FILE_TYPE, FOLDER_TYPE, type Folder } from '../../types';
import { isTreeNodeAFolder } from '../../utils/file-tree-utils';
import {
  activeDropTargetIdAtom,
  contextMenuDataAtom,
  dragHighlightIdsAtom,
  projectSettingsAtom,
  sidebarSelectionAtom,
  type SidebarSelectionState,
} from '../../../../../atoms';
import { InlineTreeItemInput } from '../inline-tree-item-input';
import { PaperclipPlus } from '../../../../../icons/paperclip-plus';
import {
  MenuItemLabel,
  useContextMenuItems,
} from '../../../../context-menu/items';
import { cn } from '../../../../../utils/string-formatting';
import { fileTreeDataAtom } from '../../../../../atoms';
import {
  useFileTreeFolderAddActions,
  useFileTreeFolderRenameActions,
  type FetchFolderChildrenArgs,
} from './hooks';
import {
  getFileTreeItemIndent,
  hasLoadedChildren,
  isItemAlreadyInDropDestination,
} from '../../utils/file-tree-utils';
import { setFolderOpen } from '../../hooks/open-folder';
import { getContextMenuSelectionItems } from '../../utils/item-selection';
import {
  handleFileTreeDragEnd,
  handleFileTreeDragStart,
} from '../../utils/drag';
import { draggedGhostElementAtom } from '../../../../editor/atoms';
import {
  useAddFolderAttachmentsMutation,
  useMoveTreeItemsMutation,
} from '../../hooks/tree-item-mutations';
import { LoadingSpinner } from '../../../../loading-spinner';
import { motion } from 'motion/react';
import { createFolderPath } from '../../../../../utils/path';
import { useFolderPathFromRoute } from '../../../../../hooks/routes';

export function FileTreeFolderItem({
  dataItem,
  fetchFolderChildren,
  onSelectionClick,
  addItemToSidebarSelection,
  isSelectedFromSidebarClick,
  isFetchPending,
}: {
  dataItem: Folder & { level: number };
  fetchFolderChildren: (args: FetchFolderChildrenArgs) => void;
  onSelectionClick: (e: MouseEvent) => void;
  addItemToSidebarSelection: () => SidebarSelectionState | null;
  isSelectedFromSidebarClick: boolean;
  isFetchPending: boolean;
}) {
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Tracks whether the rename input was previously active so focus can return to the row button.
  const wasEditingRef = useRef(false);

  const [contextMenuData, setContextMenuData] = useAtom(contextMenuDataAtom);
  const [activeDropTargetId, setActiveDropTargetId] = useAtom(
    activeDropTargetIdAtom
  );
  const dragHighlightIds = useAtomValue(dragHighlightIdsAtom);
  const setDragHighlightIds = useSetAtom(dragHighlightIdsAtom);
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const sidebarSelection = useAtomValue(sidebarSelectionAtom);
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);
  const setDraggedGhostElement = useSetAtom(draggedGhostElementAtom);
  const folderPathFromRoute = useFolderPathFromRoute();
  const paddingLeft = getFileTreeItemIndent(dataItem.level);
  const { revealInFinder, pin, rename, moveToTrash } = useContextMenuItems();
  const { mutate: addFolderAttachments } = useAddFolderAttachmentsMutation();
  const { mutateAsync: moveItemsToFolder } = useMoveTreeItemsMutation();
  const {
    isEditing,
    setIsEditing,
    renameErrorText,
    exitEditMode,
    onRenameSave,
    resetRenameTreeItem,
  } = useFileTreeFolderRenameActions({
    dataItem,
  });

  useEffect(() => {
    if (wasEditingRef.current && !isEditing) {
      buttonRef.current?.focus();
    }
    wasEditingRef.current = isEditing;
  }, [isEditing]);

  const {
    addingType,
    setAddingType,
    addErrorText,
    closeAddInput,
    onAddSave,
    resetAddTreeItem,
  } = useFileTreeFolderAddActions({ dataItem });
  const resolvedFolderPath = createFolderPath(dataItem.path);
  const isSelectedFromRoute =
    folderPathFromRoute && resolvedFolderPath
      ? folderPathFromRoute.equals(resolvedFolderPath)
      : false;

  function handleClick(e: MouseEvent) {
    if (!isTreeNodeAFolder(dataItem)) {
      return;
    }

    // Stop propagation for modifier clicks to prevent parent handlers from clearing selection
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.stopPropagation();
    }

    // Handle selection logic first
    onSelectionClick(e);

    // Then handle folder open/close (only on default click, not modifier clicks)
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
      if (resolvedFolderPath) {
        navigate(resolvedFolderPath.encodedFolderUrl);
      }
      const willOpen = !dataItem.isOpen;
      setFolderOpen({
        setFileTreeData,
        folderId: dataItem.id,
        isOpen: willOpen,
      });
      if (willOpen && !hasLoadedChildren(dataItem)) {
        fetchFolderChildren({
          pathToFolder: dataItem.path,
          folderId: dataItem.id,
        });
      }
    }
  }

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
    <>
      <span
        style={{ paddingLeft }}
        className={cn(
          'rounded-md flex items-center gap-2 py-1 pr-2 overflow-hidden w-full hover:bg-zinc-100 dark:hover:bg-zinc-650 focus:bg-zinc-100 dark:focus:bg-zinc-650',
          !hasDragHighlight &&
            !isDraggedOver &&
            !shouldMuteSelection &&
            isSelectedFromRoute &&
            'bg-zinc-150 dark:bg-zinc-600 text-(--accent-color)',
          !hasDragHighlight &&
            !shouldMuteSelection &&
            (isSelectedFromSidebarClick || isDraggedOver) &&
            'bg-(--accent-color)! text-white!',
          shouldMuteSelection &&
            'bg-zinc-200 text-zinc-500 hover:bg-zinc-200 focus:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:focus:bg-zinc-700',
          hasDragHighlight &&
            'bg-(--accent-color)/25 hover:bg-(--accent-color)/25 dark:hover:bg-(--accent-color)/25 focus:bg-(--accent-color)/25 dark:focus:bg-(--accent-color)/25'
        )}
      >
        {isTreeNodeAFolder(dataItem) && dataItem.isOpen ? (
          <FolderOpen
            className="min-w-4 min-h-4 will-change-transform"
            height="1rem"
            width="1rem"
            strokeWidth={1.75}
          />
        ) : (
          <FolderIcon
            className="min-w-4 min-h-4 will-change-transform"
            height="1rem"
            width="1rem"
            strokeWidth={1.75}
          />
        )}
        <InlineTreeItemInput
          dataItem={dataItem}
          defaultValue={dataItem.name}
          isEditing={isEditing}
          errorText={renameErrorText}
          exitEditMode={exitEditMode}
          onSave={onRenameSave}
        />
        {isFetchPending && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.25 }}
            className="ml-auto inline-flex h-4 w-4 items-center justify-center"
          >
            <LoadingSpinner className="h-4 w-4" height="1rem" width="1rem" />
          </motion.span>
        )}
      </span>
    </>
  );

  const paddingForItemToAdd = getFileTreeItemIndent(dataItem.level + 1);

  const inlineInput = addingType &&
    isTreeNodeAFolder(dataItem) &&
    dataItem.isOpen && (
      <div
        style={{ paddingLeft: paddingForItemToAdd }}
        className="flex items-center w-full relative rounded-md py-0.25"
      >
        <span className="rounded-md flex items-center gap-2 z-10 py-1 pr-2 overflow-hidden w-full">
          {addingType === FOLDER_TYPE ? (
            <FolderIcon
              className="min-w-4 min-h-4"
              height="1rem"
              width="1rem"
              strokeWidth={1.75}
            />
          ) : (
            <Blog
              className="min-w-4 min-h-4"
              height="1rem"
              width="1rem"
              strokeWidth={1.75}
            />
          )}
          <InlineTreeItemInput
            dataItem={dataItem}
            defaultValue=""
            isEditing={true}
            errorText={addErrorText}
            exitEditMode={closeAddInput}
            onSave={onAddSave}
            placeholder={addingType === FOLDER_TYPE ? 'New folder' : 'New note'}
            extension={addingType === FILE_TYPE ? 'md' : undefined}
          />
        </span>
      </div>
    );

  if (isEditing) {
    return (
      <>
        <div className="flex items-center w-full relative rounded-md py-0.25">
          {innerContent}
        </div>
      </>
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
  }

  return (
    <div className="w-full">
      <button
        ref={buttonRef}
        data-file-drop-target
        id={dataItem.id}
        role="treeitem"
        aria-expanded={dataItem.isOpen}
        aria-level={dataItem.level + 1}
        aria-selected={isSelectedFromSidebarClick || isSelectedFromRoute}
        draggable={true}
        className={cn(
          'flex items-center w-full relative rounded-md py-0.25 focus:outline-2 focus:outline-(--accent-color) focus:-outline-offset-2 file-tree-drop-target',
          isContextMenuTarget &&
            'outline-2 outline-(--accent-color) -outline-offset-2'
        )}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggedOver(true);
          setActiveDropTargetId(dataItem.id);
          setDragHighlightIds(new Set());
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggedOver(false);
          setActiveDropTargetId((currentId) =>
            currentId === dataItem.id ? null : currentId
          );
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggedOver(false);
          setActiveDropTargetId(null);
          void moveItemsToFolder(dataItem.path);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            setAddingType(null);
            resetRenameTreeItem();
            setIsEditing(true);
          }
        }}
        onClick={handleClick}
        onContextMenu={(e) => {
          if (!isTreeNodeAFolder(dataItem)) return;

          e.preventDefault();
          const { selectedItems } = getContextMenuSelectionItems({
            currentItem: dataItem,
            sidebarSelections: sidebarSelection.selections,
            fileOrFolderMap,
          });
          const isMultiSelection = selectedItems.length > 1;
          const selectedFolders = selectedItems.filter((item) =>
            isTreeNodeAFolder(item)
          );
          const shouldPinSelectedFolders = selectedFolders.some(
            (item) => !projectSettings.pinnedNotes.has(item.path)
          );

          const folderPathForReveal = !isMultiSelection
            ? createFolderPath(dataItem.path)
            : null;

          const addFolderOption = !isMultiSelection
            ? [
                {
                  label: (
                    <MenuItemLabel
                      icon={<FolderPen width="1.0625rem" height="1.0625rem" />}
                    >
                      Create Folder
                    </MenuItemLabel>
                  ),
                  value: 'create-folder',
                  onChange: () => {
                    if (!dataItem.isOpen) {
                      setFolderOpen({
                        setFileTreeData,
                        folderId: dataItem.id,
                        isOpen: true,
                      });
                      if (!hasLoadedChildren(dataItem)) {
                        fetchFolderChildren({
                          pathToFolder: dataItem.path,
                          folderId: dataItem.id,
                        });
                      }
                    }
                    resetAddTreeItem();
                    setAddingType(FOLDER_TYPE);
                  },
                },
              ]
            : [];

          const addNoteOption = !isMultiSelection
            ? [
                {
                  label: (
                    <MenuItemLabel
                      icon={<Blog width="1.0625rem" height="1.0625rem" />}
                    >
                      Create Note
                    </MenuItemLabel>
                  ),
                  value: 'create-note',
                  onChange: () => {
                    if (!dataItem.isOpen) {
                      setFolderOpen({
                        setFileTreeData,
                        folderId: dataItem.id,
                        isOpen: true,
                      });
                      if (!hasLoadedChildren(dataItem)) {
                        fetchFolderChildren({
                          pathToFolder: dataItem.path,
                          folderId: dataItem.id,
                        });
                      }
                    }
                    resetAddTreeItem();
                    setAddingType(FILE_TYPE);
                  },
                },
              ]
            : [];

          const addAttachmentsOption = !isMultiSelection
            ? [
                {
                  label: (
                    <MenuItemLabel
                      icon={
                        <PaperclipPlus width="1.0625rem" height="1.0625rem" />
                      }
                    >
                      Add attachments
                    </MenuItemLabel>
                  ),
                  value: 'add-attachments',
                  onChange: () => {
                    addFolderAttachments(dataItem.path);
                  },
                },
              ]
            : [];

          setContextMenuData({
            x: e.clientX,
            y: e.clientY,
            isShowing: true,
            targetId: dataItem.id,
            items: [
              ...(folderPathForReveal
                ? [revealInFinder({ path: folderPathForReveal })]
                : []),
              ...addFolderOption,
              ...addNoteOption,
              ...addAttachmentsOption,
              ...(selectedFolders.length > 0
                ? [
                    pin({
                      paths: selectedFolders.map((item) => item.path),
                      shouldPin: shouldPinSelectedFolders,
                      kind: 'folder',
                    }),
                  ]
                : []),
              ...(!isMultiSelection
                ? [
                    rename({
                      onRename: () => {
                        setAddingType(null);
                        resetRenameTreeItem();
                        setIsEditing(true);
                      },
                    }),
                  ]
                : []),
              moveToTrash({
                paths: selectedItems.map((item) => item.path),
              }),
            ],
          });
        }}
      >
        {innerContent}
      </button>
      {inlineInput}
    </div>
  );
}
