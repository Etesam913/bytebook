import { useSetAtom, useAtomValue } from 'jotai';
import { MouseEvent, DragEvent, useState } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { Folder as FolderIcon } from '../../../../../icons/folder';
import { FolderOpen } from '../../../../../icons/folder-open';
import { FolderPen } from '../../../../../icons/folder-pen';
import { Blog } from '../../../../../icons/blog';
import { FILE_TYPE, FOLDER_TYPE, type Folder } from '../../types';
import {
  contextMenuDataAtom,
  projectSettingsAtom,
  type SidebarSelectionState,
} from '../../../../../atoms';
import { currentZoomAtom } from '../../../../../hooks/resize';
import { InlineTreeItemInput } from '../inline-tree-item-input';
import { Finder } from '../../../../../icons/finder';
import { PinTack2 } from '../../../../../icons/pin-tack-2';
import { PinTackSlash } from '../../../../../icons/pin-tack-slash';
import { Trash } from '../../../../../icons/trash';
import { FilePen } from '../../../../../icons/file-pen';
import { PaperclipPlus } from '../../../../../icons/paperclip-plus';
import { useRevealInFinderMutation } from '../../../../../hooks/code';
import {
  useMoveToTrashMutation,
  usePinPathMutation,
} from '../../../../../hooks/notes';
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
} from '../../utils/file-tree-utils';
import { setFolderOpen } from '../../hooks/open-folder';
import {
  createDragGhostElement,
  getContextMenuSelectionItems,
} from '../../utils/item-selection';
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

  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const folderPathFromRoute = useFolderPathFromRoute();
  const currentZoom = useAtomValue(currentZoomAtom);
  const paddingLeft = getFileTreeItemIndent(dataItem.level, currentZoom);
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutation();
  const { mutate: pinPath } = usePinPathMutation();
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
    if (dataItem.type !== FOLDER_TYPE) {
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

  const innerContent = (
    <>
      <span
        style={{ paddingLeft: `${paddingLeft}px` }}
        className={cn(
          'rounded-md flex items-center gap-2 py-1 pr-2 overflow-hidden w-full hover:bg-zinc-100 dark:hover:bg-zinc-650 focus:bg-zinc-100 dark:focus:bg-zinc-650',
          isSelectedFromRoute &&
            'bg-zinc-150 dark:bg-zinc-600 text-(--accent-color)',
          (isSelectedFromSidebarClick || isDraggedOver) &&
            'bg-(--accent-color)! text-white!'
        )}
      >
        {dataItem.type === FOLDER_TYPE && dataItem.isOpen ? (
          <FolderOpen
            className="min-w-4 min-h-4 will-change-transform"
            height={16}
            width={16}
            strokeWidth={1.75}
          />
        ) : (
          <FolderIcon
            className="min-w-4 min-h-4 will-change-transform"
            height={16}
            width={16}
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
            <LoadingSpinner className="h-4 w-4" height={16} width={16} />
          </motion.span>
        )}
      </span>
    </>
  );

  const paddingForItemToAdd = getFileTreeItemIndent(
    dataItem.level + 1,
    currentZoom
  );
  const inlineInput = addingType &&
    dataItem.type === FOLDER_TYPE &&
    dataItem.isOpen && (
      <div
        style={{ paddingLeft: `${paddingForItemToAdd}px` }}
        className="flex items-center w-full relative rounded-md py-0.25"
      >
        <span className="rounded-md flex items-center gap-2 z-10 py-1 pr-2 overflow-hidden w-full">
          {addingType === FOLDER_TYPE ? (
            <FolderIcon
              className="min-w-4 min-h-4"
              height={16}
              width={16}
              strokeWidth={1.75}
            />
          ) : (
            <Blog
              className="min-w-4 min-h-4"
              height={16}
              width={16}
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
    <div className="w-full">
      <button
        data-file-drop-target
        id={dataItem.id}
        draggable={true}
        className="flex items-center w-full relative rounded-md py-0.25 focus:outline-2 focus:outline-(--accent-color) focus:-outline-offset-2 file-tree-drop-target"
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggedOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggedOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggedOver(false);
          void moveItemsToFolder(dataItem.path);
        }}
        onClick={handleClick}
        onContextMenu={(e) => {
          if (dataItem.type !== FOLDER_TYPE) return;

          e.preventDefault();
          const newSelectionState = addItemToSidebarSelection();
          if (!newSelectionState) return;

          const { selectedItems } = getContextMenuSelectionItems({
            currentItem: dataItem,
            sidebarSelections: newSelectionState.selections,
            fileOrFolderMap,
          });
          const isMultiSelection = selectedItems.length > 1;
          const selectedFolders = selectedItems.filter(
            (item) => item.type === FOLDER_TYPE
          );
          const shouldPinSelectedFolders = selectedFolders.some(
            (item) => !projectSettings.pinnedNotes.has(item.path)
          );

          // Only show "Add Folder" and "Add Note" if not multiselect
          const addFolderOption = !isMultiSelection
            ? [
                {
                  label: (
                    <span className="flex items-center gap-1.5">
                      <FolderPen width={17} height={17} />{' '}
                      <span>Create Folder</span>
                    </span>
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
                    <span className="flex items-center gap-1.5">
                      <Blog width={17} height={17} /> <span>Create Note</span>
                    </span>
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
                    <span className="flex items-center gap-1.5">
                      <PaperclipPlus width={17} height={17} />
                      <span>Add attachments</span>
                    </span>
                  ),
                  value: 'add-attachments',
                  onChange: () => {
                    addFolderAttachments(dataItem.path);
                  },
                },
              ]
            : [];

          const renameOption = !isMultiSelection
            ? [
                {
                  label: (
                    <span className="flex items-center gap-1.5">
                      <FilePen height={17} width={17} /> <span>Rename</span>
                    </span>
                  ),
                  value: 'rename',
                  onChange: () => {
                    setAddingType(null);
                    resetRenameTreeItem();
                    setIsEditing(true);
                  },
                },
              ]
            : [];

          const pinFolderOption =
            selectedFolders.length > 0
              ? [
                  {
                    label: (
                      <span className="flex items-center gap-1.5">
                        {shouldPinSelectedFolders ? (
                          <PinTack2 height={17} width={17} />
                        ) : (
                          <PinTackSlash height={17} width={17} />
                        )}
                        <span>
                          {shouldPinSelectedFolders
                            ? selectedFolders.length > 1
                              ? 'Pin Folders'
                              : 'Pin Folder'
                            : selectedFolders.length > 1
                              ? 'Unpin Folders'
                              : 'Unpin Folder'}
                        </span>
                      </span>
                    ),
                    value: shouldPinSelectedFolders
                      ? 'pin-folder'
                      : 'unpin-folder',
                    onChange: () => {
                      selectedFolders.forEach((item) => {
                        pinPath({
                          path: item.path,
                          shouldPin: shouldPinSelectedFolders,
                        });
                      });
                    },
                  },
                ]
              : [];

          setContextMenuData({
            x: e.clientX / currentZoom,
            y: e.clientY / currentZoom,
            isShowing: true,
            items: [
              {
                label: (
                  <span className="flex items-center gap-1.5">
                    <Finder height={17} width={17} />{' '}
                    <span>Reveal In Finder</span>
                  </span>
                ),
                value: 'reveal-in-finder',
                onChange: () => {
                  selectedItems.forEach((item, index) => {
                    console.log(item, index);
                    if (index === 0) {
                      revealInFinder({
                        path: `notes/${item.path}`,
                        shouldPrefixWithProjectPath: true,
                      });
                    } else {
                      // Put a delay to give the user time to see each item revealed
                      setTimeout(() => {
                        revealInFinder({
                          path: `notes/${item.path}`,
                          shouldPrefixWithProjectPath: true,
                        });
                      }, 300);
                    }
                  });
                },
              },
              ...addFolderOption,
              ...addNoteOption,
              ...addAttachmentsOption,
              ...pinFolderOption,
              ...renameOption,
              {
                value: 'move-to-trash',
                label: (
                  <span className="flex items-center gap-1.5">
                    <Trash height={17} width={17} /> <span>Move to Trash</span>
                  </span>
                ),
                onChange: () => {
                  moveToTrash({
                    paths: selectedItems.map((item) => item.path),
                  });
                },
              },
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
