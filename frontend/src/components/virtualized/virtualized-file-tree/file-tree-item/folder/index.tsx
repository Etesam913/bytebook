import { useSetAtom, useAtomValue } from 'jotai';
import { MouseEvent, DragEvent } from 'react';
import { Folder as FolderIcon } from '../../../../../icons/folder';
import { FolderOpen } from '../../../../../icons/folder-open';
import { FolderPlus } from '../../../../../icons/folder-plus';
import { Note } from '../../../../../icons/page';
import type { Folder } from '../../types';
import { contextMenuDataAtom } from '../../../../../atoms';
import { currentZoomAtom } from '../../../../../hooks/resize';
import { InlineTreeItemInput } from '../inline-tree-item-input';
import { Finder } from '../../../../../icons/finder';
import { Trash } from '../../../../../icons/trash';
import { FilePen } from '../../../../../icons/file-pen';
import { useRevealInFinderMutation } from '../../../../../hooks/code';
import { useMoveToTrashMutationNew } from '../../../../../hooks/notes';
import { cn } from '../../../../../utils/string-formatting';
import { fileTreeDataAtom } from '../..';
import {
  useFileTreeFolderAddActions,
  useFileTreeFolderRenameActions,
  type OpenFolderArgs,
} from './hooks';
import { getFileTreeItemIndent } from '../../utils/file-tree-utils';
import { createDragGhostElement } from '../../utils/item-selection';
import { sidebarSelectionAtom } from '../../../../../hooks/selection';

export function FileTreeFolderItem({
  dataItem,
  openFolder,
  onSelectionClick,
  onContextMenuSelection,
  isSelectedFromSidebarClick,
}: {
  dataItem: Folder & { level: number };
  openFolder: (args: OpenFolderArgs) => void;
  onSelectionClick: (e: MouseEvent) => void;
  onContextMenuSelection: () => void;
  isSelectedFromSidebarClick: boolean;
}) {
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const sidebarSelection = useAtomValue(sidebarSelectionAtom);
  const currentZoom = useAtomValue(currentZoomAtom);
  const paddingLeft = getFileTreeItemIndent(dataItem.level, currentZoom);
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutationNew();
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
          'rounded-md flex items-center gap-2 z-10 py-1 pr-2 overflow-hidden w-full hover:bg-zinc-100 dark:hover:bg-zinc-650 focus:bg-zinc-100 dark:focus:bg-zinc-650',
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
    <div className="w-full">
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
        className="flex items-center w-full relative rounded-md py-0.25 justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent-color)] focus-visible:outline-offset-2"
      >
        {innerContent}
      </button>
      {inlineInput}
    </div>
  );
}
