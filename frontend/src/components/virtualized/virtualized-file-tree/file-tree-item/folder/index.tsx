import { useSetAtom, useAtomValue } from 'jotai';
import { MouseEvent, DragEvent, useState } from 'react';
import { Folder as FolderIcon } from '../../../../../icons/folder';
import { FolderOpen } from '../../../../../icons/folder-open';
import { FolderPlus } from '../../../../../icons/folder-plus';
import { Note } from '../../../../../icons/page';
import type { Folder } from '../../types';
import {
  contextMenuDataAtom,
  type SidebarSelectionState,
} from '../../../../../atoms';
import { currentZoomAtom } from '../../../../../hooks/resize';
import { InlineTreeItemInput } from '../inline-tree-item-input';
import { Finder } from '../../../../../icons/finder';
import { Trash } from '../../../../../icons/trash';
import { FilePen } from '../../../../../icons/file-pen';
import { PaperclipPlus } from '../../../../../icons/paperclip-plus';
import { useRevealInFinderMutation } from '../../../../../hooks/code';
import { useMoveToTrashMutation } from '../../../../../hooks/notes';
import { cn } from '../../../../../utils/string-formatting';
import { fileTreeDataAtom } from '../../../../../atoms';
import {
  useFileTreeFolderAddActions,
  useFileTreeFolderRenameActions,
  type OpenFolderArgs,
} from './hooks';
import { getFileTreeItemIndent } from '../../utils/file-tree-utils';
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

export function FileTreeFolderItem({
  dataItem,
  openFolder,
  onSelectionClick,
  addItemToSidebarSelection,
  isSelectedFromSidebarClick,
  isOpenFolderPending,
}: {
  dataItem: Folder & { level: number };
  openFolder: (args: OpenFolderArgs) => void;
  onSelectionClick: (e: MouseEvent) => void;
  addItemToSidebarSelection: () => SidebarSelectionState | null;
  isSelectedFromSidebarClick: boolean;
  isOpenFolderPending: boolean;
}) {
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const currentZoom = useAtomValue(currentZoomAtom);
  const paddingLeft = getFileTreeItemIndent(dataItem.level, currentZoom);
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutation();
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

  async function handleClick(e: MouseEvent) {
    if (dataItem.type !== 'folder') {
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
      if (!dataItem.isOpen) {
        openFolder({
          pathToFolder: dataItem.path,
          folderId: dataItem.id,
        });
      } else {
        setFileTreeData((prev) => {
          const newTreeData = new Map(prev.treeData);
          newTreeData.set(dataItem.id, { ...dataItem, isOpen: false });
          return {
            ...prev,
            treeData: newTreeData,
          };
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
          (isSelectedFromSidebarClick || isDraggedOver) &&
            'bg-(--accent-color)! text-white!'
        )}
      >
        {dataItem.type === 'folder' && dataItem.isOpen ? (
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
        {isOpenFolderPending && (
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
    dataItem.type === 'folder' &&
    dataItem.isOpen && (
      <div
        style={{ paddingLeft: `${paddingForItemToAdd}px` }}
        className="flex items-center w-full relative rounded-md py-0.25"
      >
        <span className="rounded-md flex items-center gap-2 z-10 py-1 pr-2 overflow-hidden w-full">
          {addingType === 'folder' ? (
            <FolderIcon
              className="min-w-4 min-h-4"
              height={16}
              width={16}
              strokeWidth={1.75}
            />
          ) : (
            <Note
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
            placeholder={addingType === 'folder' ? 'New folder' : 'New note'}
            extension={addingType === 'note' ? 'md' : undefined}
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
        onDragEnter={() => {
          console.log('drag enter');
        }}
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
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggedOver(false);
          await moveItemsToFolder(dataItem.path);
        }}
        onClick={handleClick}
        onContextMenu={(e) => {
          if (dataItem.type !== 'folder') return;

          e.preventDefault();
          const newSelectionState = addItemToSidebarSelection();
          if (!newSelectionState) return;

          const { selectedItems } = getContextMenuSelectionItems({
            currentItem: dataItem,
            sidebarSelections: newSelectionState.selections,
            fileOrFolderMap,
          });
          const isMultiSelection = selectedItems.length > 1;

          // Only show "Add Folder" and "Add Note" if not multiselect
          const addFolderOption = !isMultiSelection
            ? [
                {
                  label: (
                    <span className="flex items-center gap-1.5">
                      <FolderPlus width={17} height={17} />{' '}
                      <span>Add Folder</span>
                    </span>
                  ),
                  value: 'add-folder',
                  onChange: () => {
                    if (!dataItem.isOpen) {
                      openFolder({
                        pathToFolder: dataItem.path,
                        folderId: dataItem.id,
                      });
                    }
                    resetAddTreeItem();
                    setAddingType('folder');
                  },
                },
              ]
            : [];

          const addNoteOption = !isMultiSelection
            ? [
                {
                  label: (
                    <span className="flex items-center gap-1.5">
                      <Note width={17} height={17} /> <span>Add Note</span>
                    </span>
                  ),
                  value: 'add-note',
                  onChange: () => {
                    if (!dataItem.isOpen) {
                      openFolder({
                        pathToFolder: dataItem.path,
                        folderId: dataItem.id,
                      });
                    }
                    resetAddTreeItem();
                    setAddingType('note');
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
