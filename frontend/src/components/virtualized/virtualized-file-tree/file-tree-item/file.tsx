import { useAtom, useAtomValue } from 'jotai';
import { Dispatch, SetStateAction } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { Note } from '../../../../icons/page';
import { fileOrFolderMapAtom } from '..';
import { useFilePathFromRoute } from '../../../../hooks/routes';
import { useRenameFileMutation } from '../../../../hooks/notes';
import { createFilePath } from '../../../../utils/path';
import {
  sidebarSelectionAtom,
  useAddToSidebarSelection,
} from '../../../../hooks/selection';
import {
  SelectableItems,
  getKeyForSidebarSelection,
} from '../../../../utils/selection';
import { cn, encodeContextMenuData } from '../../../../utils/string-formatting';
import type { FlattenedFileOrFolder } from '../types';
import {
  InlineTreeItemInput,
  useInlineTreeItemInput,
} from './inline-tree-item-input';
import { computeMetaClickState, computeShiftClickSelections } from '../utils';

export function FileTreeFileItem({
  dataItem,
}: {
  dataItem: FlattenedFileOrFolder;
}) {
  const fileOrFolderMap = useAtomValue(fileOrFolderMapAtom);
  const [sidebarSelection, setSidebarSelection] = useAtom(sidebarSelectionAtom);
  const addToSidebarSelection = useAddToSidebarSelection();
  const filePathFromRoute = useFilePathFromRoute();
  const { mutateAsync: renameFile } = useRenameFileMutation();
  const contextMenuData = encodeContextMenuData(dataItem.id);
  const lastDotIndex = dataItem.name.lastIndexOf('.');
  const nameWithoutExtension =
    lastDotIndex === -1 ? dataItem.name : dataItem.name.slice(0, lastDotIndex);
  const extension =
    lastDotIndex === -1 ? undefined : dataItem.name.slice(lastDotIndex + 1);

  async function onRename({
    newName,
    setErrorText,
    exitEditMode,
  }: {
    newName: string;
    setErrorText: Dispatch<SetStateAction<string>>;
    exitEditMode: () => void;
  }) {
    const filePath = createFilePath(dataItem.path);
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

  const { isEditing, errorText, exitEditMode, onSaveHandler } =
    useInlineTreeItemInput({
      itemId: dataItem.id,
      defaultValue: nameWithoutExtension,
      onSave: onRename,
    });

  // File path should be defined for files
  const filePath = createFilePath(dataItem.path);
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

    const result = computeShiftClickSelections({
      fileOrFolderMap,
      dataItem,
      anchorSelectionKey,
    });

    if (!result) {
      return;
    }

    setSidebarSelection((prev) => ({
      selections: result.selections,
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
    const result = computeMetaClickState({
      fileOrFolderMap,
      dataItem,
      selectionKey,
      currentSelections: sidebarSelection.selections,
    });

    if (result) {
      // File was already selected, un-select it
      setSidebarSelection(result);
    } else {
      // File is not selected, add it to selection
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
      <span
        className={cn(
          'rounded-md flex items-center gap-2 z-10 py-1 px-2 overflow-hidden w-full hover:bg-zinc-150 dark:hover:bg-zinc-600',
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
          errorText={errorText}
          exitEditMode={exitEditMode}
          onSave={onSaveHandler}
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
