import { useState } from 'react';
import {
  FILE_TYPE,
  FOLDER_TYPE,
  type FlattenedFileOrFolder,
  type Folder,
} from '../../types';
import {
  useAddTreeItemMutation,
  useRenameTreeItemMutation,
} from '../../hooks/tree-item-mutations';

export type FetchFolderChildrenArgs = {
  pathToFolder: string;
  folderId: string;
  isLoadMore?: boolean;
};

export function useFileTreeFolderRenameActions({
  dataItem,
}: {
  dataItem: Folder;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const {
    mutate: renameTreeItem,
    error: renameTreeItemError,
    reset: resetRenameTreeItem,
  } = useRenameTreeItemMutation();

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

  return {
    isEditing,
    setIsEditing,
    renameErrorText,
    exitEditMode,
    onRenameSave,
    resetRenameTreeItem,
  };
}

export function useFileTreeFolderAddActions({
  dataItem,
}: {
  dataItem: FlattenedFileOrFolder | null;
}) {
  const [addingType, setAddingType] = useState<
    typeof FOLDER_TYPE | typeof FILE_TYPE | null
  >(null);
  const {
    mutate: addTreeItem,
    error: addTreeItemError,
    reset: resetAddTreeItem,
  } = useAddTreeItemMutation();

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

    if (!addingType) {
      closeAddInput();
      return;
    }

    if (dataItem && dataItem.type !== FOLDER_TYPE) {
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

  return {
    addingType,
    setAddingType,
    addErrorText,
    closeAddInput,
    onAddSave,
    resetAddTreeItem,
  };
}
