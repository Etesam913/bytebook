import { useSetAtom, useAtomValue } from 'jotai';
import { MouseEvent, useState } from 'react';
import { Folder as FolderIcon } from '../../../../icons/folder';
import { FolderOpen } from '../../../../icons/folder-open';
import { FolderPlus } from '../../../../icons/folder-plus';
import { Note } from '../../../../icons/page';
import type { Folder } from '../types';
import { contextMenuDataAtom } from '../../../../atoms';
import { currentZoomAtom } from '../../../../hooks/resize';
import { InlineTreeItemInput } from './inline-tree-item-input';
import {
  OpenFolderAndAddToFileWatcher,
  CloseFolderAndRemoveFromFileWatcher,
} from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { Finder } from '../../../../icons/finder';
import { Trash } from '../../../../icons/trash';
import { FilePen } from '../../../../icons/file-pen';
import { useRevealInFinderMutation } from '../../../../hooks/code';
import { useMoveToTrashMutationNew } from '../../../../hooks/notes';
import { cn } from '../../../../utils/string-formatting';
import { fileTreeDataAtom } from '..';
import { useAddTreeItemMutation, useRenameTreeItemMutation } from '../hooks';

type OpenFolderArgs = {
  pathToFolder: string;
  folderId: string;
  isLoadMore?: boolean;
};

export function FileTreeFolderItem({
  dataItem,
  openFolder,
  onSelectionClick,
  onContextMenuSelection,
  isSelectedFromSidebarClick,
  paddingLeft,
}: {
  dataItem: Folder;
  openFolder: (args: OpenFolderArgs) => void;
  onSelectionClick: (e: MouseEvent) => void;
  onContextMenuSelection: () => void;
  isSelectedFromSidebarClick: boolean;
  paddingLeft: number;
}) {
  const [addingType, setAddingType] = useState<'folder' | 'note' | null>(null);
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const currentZoom = useAtomValue(currentZoomAtom);
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutationNew();
  const {
    mutate: addTreeItem,
    error: addTreeItemError,
    reset: resetAddTreeItem,
  } = useAddTreeItemMutation();
  const {
    mutate: renameTreeItem,
    error: renameTreeItemError,
    reset: resetRenameTreeItem,
  } = useRenameTreeItemMutation();

  const [isEditing, setIsEditing] = useState(false);

  function exitEditMode() {
    setIsEditing(false);
    resetRenameTreeItem();
  }

  function onRenameSave(newName: string) {
    const trimmedName = newName.trim();

    if (trimmedName === dataItem.name) {
      exitEditMode();
      return;
    }

    renameTreeItem({
      itemType: 'folder',
      folderPath: dataItem.path,
      newName: trimmedName,
      onSuccess: exitEditMode,
    });
  }

  const renameErrorText =
    renameTreeItemError instanceof Error
      ? renameTreeItemError.message
      : renameTreeItemError
        ? 'An error occurred'
        : '';

  function closeAddInput() {
    resetAddTreeItem();
    setAddingType(null);
  }

  function onAddSave(newName: string) {
    const trimmedName = newName.trim();

    // If name is empty, just exit
    if (!trimmedName) {
      closeAddInput();
      return;
    }

    if (!addingType || dataItem.type !== 'folder') {
      closeAddInput();
      return;
    }

    addTreeItem({
      parentFolder: dataItem,
      addType: addingType,
      newName: trimmedName,
      onSuccess: closeAddInput,
    });
  }

  const addErrorText =
    addTreeItemError instanceof Error
      ? addTreeItemError.message
      : addTreeItemError
        ? 'An error occurred'
        : '';

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
        await OpenFolderAndAddToFileWatcher(dataItem.path);
      } else {
        setFileTreeData((prev) => {
          const newTreeData = new Map(prev.treeData);
          newTreeData.set(dataItem.id, { ...dataItem, isOpen: false });
          return {
            ...prev,
            treeData: newTreeData,
          };
        });
        // Remove folder from file watcher when closing
        await CloseFolderAndRemoveFromFileWatcher(dataItem.path);
      }
    }
  }

  const innerContent = (
    <>
      <span
        style={{ paddingLeft: `${paddingLeft}px` }}
        className={cn(
          'rounded-md flex items-center gap-2 z-10 py-1 px-2 overflow-hidden w-full hover:bg-zinc-100 dark:hover:bg-zinc-650 focus:bg-zinc-100 dark:focus:bg-zinc-650',
          isSelectedFromSidebarClick && 'bg-(--accent-color)! text-white!'
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
      </span>
    </>
  );

  const inlineInput = addingType &&
    dataItem.type === 'folder' &&
    dataItem.isOpen && (
      <div className="flex items-center w-full relative rounded-md py-0.25">
        <span className="rounded-md flex items-center gap-2 z-10 py-1 pl-[1.725rem] pr-2 overflow-hidden w-full">
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

  return (
    <div className="w-full">
      <button
        draggable
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
          if (dataItem.type !== 'folder') return;

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
                    <span>Reveal In Finder</span>
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
        className="flex items-center w-full relative rounded-md py-0.25"
      >
        {innerContent}
      </button>
      {inlineInput}
    </div>
  );
}
