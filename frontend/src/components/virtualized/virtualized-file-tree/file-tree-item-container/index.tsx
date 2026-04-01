import { useAtom, useAtomValue } from 'jotai';
import { useFetchFolderChildrenMutation } from '../hooks/open-folder';
import { FlattenedFileOrFolder } from '../types';
import { isTreeNodeAFile, isTreeNodeAFolder } from '../utils/file-tree-utils';
import { fileTreeDataAtom } from '../../../../atoms';
import { MouseEvent } from 'react';
import { FileTreeFileItem } from '../file-tree-item/file';
import { FileTreeFolderItem } from '../file-tree-item/folder';
import { createFilePath, createFolderPath } from '../../../../utils/path';
import { useAddToSidebarSelection } from '../../../../hooks/selection';
import {
  SelectableItem,
  getKeyForSidebarSelection,
} from '../../../../utils/selection';
import {
  computeMetaClickState,
  computeShiftClickSelections,
} from '../utils/item-selection';
import {
  sidebarSelectionAtom,
  type SidebarSelectionState,
} from '../../../../atoms';

/**
 * Container component for file tree items that handles selection logic
 * and renders either a file or folder item
 */
export function FileTreeItemContainer({
  dataItem,
}: {
  dataItem: FlattenedFileOrFolder;
}) {
  const { mutate: fetchFolderChildren, isPending: isFetchPending } =
    useFetchFolderChildrenMutation();
  const addToSidebarSelection = useAddToSidebarSelection();

  // Compute selection key and path for the data item
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const [sidebarSelection, setSidebarSelection] = useAtom(sidebarSelectionAtom);

  const path =
    isTreeNodeAFile(dataItem)
      ? createFilePath(dataItem.path)
      : createFolderPath(dataItem.path);

  const selectionKey = path
    ? getKeyForSidebarSelection({
        ...path,
        id: dataItem.id,
      })
    : null;

  const isSelectedFromSidebarClick = selectionKey
    ? sidebarSelection.selections.has(selectionKey)
    : false;

  /**
   * Handles shift-click behavior for multi-selection by selecting a range of items
   * between the anchor index and the clicked index
   */
  function handleShiftClick() {
    if (!selectionKey) return;

    const anchorSelectionKey = sidebarSelection.anchorSelection;
    if (!anchorSelectionKey) {
      setSidebarSelection((prev) => ({
        ...prev,
        selections: new Set([selectionKey]),
        anchorSelection: selectionKey,
      }));
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
      ...prev,
      selections: result.selections,
      anchorSelection: prev.anchorSelection,
    }));
  }

  /**
   * Handles cmd+click for toggling selection of an item
   * It will un-select the item and update the anchor if it is already selected
   * It will select the item if it is not already selected
   */
  function handleMetaClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!selectionKey || !path) return;

    const selectableItem: SelectableItem = {
      ...path,
      id: dataItem.id,
    };
    const result = computeMetaClickState({
      fileOrFolderMap,
      dataItem,
      selectionKey,
      currentSelections: sidebarSelection.selections,
    });

    if (result) {
      // Item was already selected, un-select it
      setSidebarSelection((prev) => ({
        ...prev,
        selections: result.selections,
        anchorSelection: result.anchorSelection,
      }));
    } else {
      // Item is not selected, add it to selection
      addToSidebarSelection(selectableItem);
    }
  }

  /**
   * Default clicks clears out selection and sets anchor
   */
  function handleDefaultClick() {
    if (!selectionKey) return;
    setSidebarSelection((prev) => ({
      ...prev,
      selections: new Set([]),
      anchorSelection: selectionKey,
    }));
  }

  function handleSelectionClick(e: MouseEvent) {
    if (!selectionKey || !path) return;

    if (e.shiftKey) {
      handleShiftClick();
    } else if (e.metaKey || e.ctrlKey) {
      handleMetaClick(e);
    } else {
      handleDefaultClick();
    }
  }

  function addItemToSidebarSelection(): SidebarSelectionState | null {
    if (!selectionKey || !path) return null;
    const selectableItem: SelectableItem = {
      ...path,
      id: dataItem.id,
    };
    return addToSidebarSelection(selectableItem);
  }

  return (
    <>
      {isTreeNodeAFolder(dataItem) ? (
        <FileTreeFolderItem
          dataItem={dataItem}
          fetchFolderChildren={fetchFolderChildren}
          onSelectionClick={handleSelectionClick}
          addItemToSidebarSelection={addItemToSidebarSelection}
          isSelectedFromSidebarClick={isSelectedFromSidebarClick}
          isFetchPending={isFetchPending}
        />
      ) : (
        <FileTreeFileItem
          dataItem={dataItem}
          onSelectionClick={handleSelectionClick}
          addItemToSidebarSelection={addItemToSidebarSelection}
          isSelectedFromSidebarClick={isSelectedFromSidebarClick}
        />
      )}
    </>
  );
}
