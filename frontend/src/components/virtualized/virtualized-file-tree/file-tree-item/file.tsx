import { useAtom, useAtomValue } from 'jotai';
import { Dispatch, SetStateAction, useState } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { AnimatePresence } from 'motion/react';
import { Note } from '../../../../icons/page';
import { fileOrFolderMapAtom } from '..';
import { useFilePathFromRoute } from '../../../../hooks/routes';
import { useRenameFileMutation } from '../../../../hooks/notes';
import { createFilePath } from '../../../../utils/path';
import { SidebarHighlight } from '../../virtualized-list/highlight';
import {
  sidebarSelectionAtom,
  useAddToSidebarSelection,
} from '../../../../hooks/selection';
import {
  SelectableItems,
  getFileSelectionKey,
  getKeyForSidebarSelection,
} from '../../../../utils/selection';
import { QUOTE_ENCODING, cn } from '../../../../utils/string-formatting';
import type { FlattenedFileOrFolder } from '../types';
import {
  FileItemEditContainer,
  useFileItemEdit,
} from './file-item-edit-container';

export function FileTreeFileItem({
  dataItem,
}: {
  dataItem: FlattenedFileOrFolder;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const fileOrFolderMap = useAtomValue(fileOrFolderMapAtom);
  const [sidebarSelection, setSidebarSelection] = useAtom(sidebarSelectionAtom);
  const addToSidebarSelection = useAddToSidebarSelection();
  const filePathFromRoute = useFilePathFromRoute();
  const { mutateAsync: renameFile } = useRenameFileMutation();
  const contextMenuData = encodeURIComponent(dataItem.id).replaceAll(
    "'",
    QUOTE_ENCODING
  );
  const lastDotIndex = dataItem.name.lastIndexOf('.');
  const nameWithoutExtension = lastDotIndex === -1 ? dataItem.name : dataItem.name.slice(0, lastDotIndex);
  const extension = lastDotIndex === -1 ? undefined : dataItem.name.slice(lastDotIndex + 1);

  async function onRename({
    newName,
    setErrorText,
    exitEditMode,
  }: {
    newName: string;
    setErrorText: Dispatch<SetStateAction<string>>;
    exitEditMode: () => void;
  }) {
    const filePath = createFilePath(dataItem.id);
    if (!filePath) {
      exitEditMode();
      return;
    }

    const newFilePathString = `${filePath.folder}/${newName}.md`;
    const newFilePath = createFilePath(newFilePathString);
    if (!newFilePath) {
      setErrorText('Invalid file path');
      return;
    }

    try {
      await renameFile({
        oldPath: filePath,
        newPath: newFilePath,
        setErrorText,
      });
      exitEditMode();
    } catch {
      // Error handling is done in the mutation
    }
  }

  const { isEditing, errorText, exitEditMode, handleRename } = useFileItemEdit({
    itemId: dataItem.id,
    defaultValue: nameWithoutExtension,
    onRename,
  });

  // File path should be defined for files
  const filePath = createFilePath(dataItem.id);
  if (!filePath) {
    return null;
  }

  const resolvedFilePath = filePath;

  // When the file is selected using cmd+click or shift+click, the selectionKey is added to the sidebarSelection atom set.
  const selectionKey = getKeyForSidebarSelection({
    ...resolvedFilePath,
    id: dataItem.id,
  });

  const isSelectedFromRoute =
    filePathFromRoute && filePathFromRoute.equals(filePath);
  const isSelectedFromSidebarClick =
    sidebarSelection.selections.has(selectionKey);

  /**
   * Finds the next anchor selection key after removing the current file from the selection.
   * It searches through sibling files in the parent folder, first looking forward from the
   * current position, then backward if no selection is found after.
   *
   * updatedSelections - The updated set of selection keys after removal
   * returns The selection key to use as the new anchor, or null if none found
   */
  function getAnchorAfterRemoval(updatedSelections: Set<string>) {
    if (!dataItem.parentId) {
      return null;
    }

    const parentFolder = fileOrFolderMap.get(dataItem.parentId);
    if (!parentFolder || parentFolder.type !== 'folder') {
      return null;
    }

    const orderedSelectionKeys: string[] = [];
    for (const childId of parentFolder.childrenIds) {
      const childItem = fileOrFolderMap.get(childId);
      if (!childItem || childItem.type !== 'file') continue;
      const childFilePath = createFilePath(childItem.id);
      if (!childFilePath) continue;
      orderedSelectionKeys.push(
        getKeyForSidebarSelection({
          ...childFilePath,
          id: childItem.id,
        })
      );
    }

    const currentIndex = orderedSelectionKeys.indexOf(selectionKey);
    if (currentIndex === -1) {
      return null;
    }

    // Get the first selection key after the one that was un-selected
    for (
      let index = currentIndex + 1;
      index < orderedSelectionKeys.length;
      index += 1
    ) {
      const candidateKey = orderedSelectionKeys[index];
      if (updatedSelections.has(candidateKey)) {
        return candidateKey;
      }
    }

    // Get the first selection key before the one that was un-selected if there is no selection key after the one that was un-selected
    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const candidateKey = orderedSelectionKeys[index];
      if (updatedSelections.has(candidateKey)) {
        return candidateKey;
      }
    }

    return null;
  }

  /**
   * Handles shift-click behavior for multi-selection by selecting a range of items
   * between the anchor index and the clicked index
   */
  function handleShiftClick() {
    const anchorSelectionKey = sidebarSelection.anchorSelection;
    if (!anchorSelectionKey) {
      setSidebarSelection({
        selections: new Set([selectionKey]),
        anchorSelection: selectionKey,
      });
      return;
    }

    const anchorSelectionId = getFileSelectionKey(anchorSelectionKey);
    if (!anchorSelectionId) {
      return;
    }
    const anchorSelectionItem = fileOrFolderMap.get(anchorSelectionId);

    // You cannot select across parents using shift click
    if (
      !anchorSelectionItem ||
      !dataItem.parentId ||
      anchorSelectionItem.parentId !== dataItem.parentId
    ) {
      return;
    }

    const parentFolder = fileOrFolderMap.get(dataItem.parentId);
    if (!parentFolder || parentFolder.type !== 'folder') {
      return;
    }

    const startIndex = parentFolder.childrenIds.indexOf(anchorSelectionItem.id);
    const endIndex = parentFolder.childrenIds.indexOf(dataItem.id);
    if (startIndex === -1 || endIndex === -1) {
      return;
    }

    const [rangeStart, rangeEnd] =
      startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

    const updatedSelections = new Set<string>();

    // Go through the range and select each file in the range
    for (let index = rangeStart; index <= rangeEnd; index += 1) {
      const childId = parentFolder.childrenIds[index];
      const childItem = fileOrFolderMap.get(childId);

      // Skips folders
      if (!childItem || childItem.type !== 'file') continue;

      const childFilePath = createFilePath(childItem.id);
      if (!childFilePath) continue;

      updatedSelections.add(
        getKeyForSidebarSelection({
          ...childFilePath,
          id: childItem.id,
        })
      );
    }

    setSidebarSelection((prev) => ({
      selections: updatedSelections,
      anchorSelection: prev.anchorSelection,
    }));
  }

  /**
   * Handles cmd+click for toggling selection of a file
   * It will un-select the file and update the anchor if it is already selected
   * It will select the file if it is not already selected
   */
  function handleMetaClick() {
    const selectableItem: SelectableItems = {
      ...resolvedFilePath,
      id: dataItem.id,
    };
    if (
      sidebarSelection.selections.has(getKeyForSidebarSelection(selectableItem))
    ) {
      // cmd+click on a selected file will un-select it
      // It also updates the anchor selection to the next item in the selection set
      // or the previous item if the next item is not selected
      setSidebarSelection((prev) => {
        const newSelections = new Set(prev.selections);
        newSelections.delete(selectionKey);

        const nextAnchor =
          getAnchorAfterRemoval(newSelections) ??
          (newSelections.values().next().value as string | undefined) ??
          null;

        return {
          selections: newSelections,
          anchorSelection: nextAnchor,
        };
      });
    } else {
      addToSidebarSelection(selectableItem);
    }
  }

  /**
   * Default clicks clears out selection and navigates to the file
   */
  function handleDefaultClick() {
    setSidebarSelection({
      selections: new Set([]),
      anchorSelection: selectionKey,
    });
    navigate(resolvedFilePath.encodedFileUrl);
  }

  const innerContent = (
    <>
      <AnimatePresence>
        {isHovered && (
          <SidebarHighlight
            layoutId={'file-tree-item-highlight'}
            className="w-[calc(100%-15px)] ml-3.75"
          />
        )}
      </AnimatePresence>
      <span
        className={cn(
          'rounded-md flex items-center gap-2 z-10 py-1 px-2 ml-3.75 overflow-hidden w-full transition-colors duration-150',
          isSelectedFromRoute && 'bg-zinc-150 dark:bg-zinc-600',
          isSelectedFromSidebarClick && 'bg-(--accent-color)! text-white!'
        )}
      >
        <Note
          className="min-w-4 min-h-4 will-change-transform"
          height={16}
          width={16}
          strokeWidth={1.75}
        />
        <FileItemEditContainer
          dataItem={dataItem}
          defaultValue={nameWithoutExtension}
          isEditing={isEditing}
          errorText={errorText}
          exitEditMode={exitEditMode}
          handleRename={handleRename}
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

  return (
    <button
      style={
        {
          '--custom-contextmenu': 'file-menu',
          '--custom-contextmenu-data': contextMenuData,
        } as React.CSSProperties
      }
      draggable
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        if (e.shiftKey) {
          handleShiftClick();
        } else if (e.metaKey || e.ctrlKey) {
          handleMetaClick();
        } else {
          handleDefaultClick();
        }
      }}
      className="flex items-center w-full relative rounded-md py-0.25"
    >
      {innerContent}
    </button>
  );
}
