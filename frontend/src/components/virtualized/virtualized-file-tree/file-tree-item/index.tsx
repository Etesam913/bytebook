import { useAtom, useAtomValue } from 'jotai';
import { useOpenFolderMutation } from '../hooks';
import { LOAD_MORE_TYPE, VirtualizedFileTreeItem } from '../types';
import { fileOrFolderMapAtom } from '..';
import { MouseEvent, ReactNode } from 'react';
import { LoadingSpinner } from '../../../loading-spinner';
import { motion } from 'motion/react';
import { LoadMoreRow } from './load-more-row';
import { FileTreeFileItem } from './file';
import { FileTreeFolderItem } from './folder';
import { currentZoomAtom } from '../../../../hooks/resize';
import { createFilePath, createFolderPath } from '../../../../utils/path';
import {
  sidebarSelectionAtom,
  useAddToSidebarSelection,
} from '../../../../hooks/selection';
import {
  SelectableItems,
  getKeyForSidebarSelection,
} from '../../../../utils/selection';
import { computeMetaClickState, computeShiftClickSelections } from '../utils';

export function FileTreeItemContainer({
  paddingLeft,
  children,
  footer,
}: {
  paddingLeft: number;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      style={{
        paddingLeft: `${paddingLeft}px`,
      }}
    >
      {children}
      {footer}
    </div>
  );
}

export function FileTreeItem({
  dataItem,
}: {
  dataItem: VirtualizedFileTreeItem;
}) {
  const { mutate: openFolder, isPending } = useOpenFolderMutation();
  const fileOrFolderMap = useAtomValue(fileOrFolderMapAtom);
  const [sidebarSelection, setSidebarSelection] = useAtom(sidebarSelectionAtom);
  const addToSidebarSelection = useAddToSidebarSelection();
  const currentZoom = useAtomValue(currentZoomAtom);
  const INDENT_WIDTH = 18;
  const paddingLeft = (dataItem.level * INDENT_WIDTH) / currentZoom;

  if (dataItem.type === LOAD_MORE_TYPE) {
    const parentFolder = fileOrFolderMap.get(dataItem.parentId);
    return (
      <LoadMoreRow
        paddingLeft={paddingLeft}
        onLoadMore={() => {
          if (parentFolder && parentFolder.type === 'folder') {
            openFolder({
              pathToFolder: parentFolder.path,
              folderId: parentFolder.id,
              isLoadMore: true,
            });
          }
        }}
      />
    );
  }

  // After the LOAD_MORE_TYPE check, dataItem is guaranteed to be FlattenedFileOrFolder
  const flattenedDataItem = dataItem;

  // Compute selection key and state for files and folders
  const path =
    dataItem.type === 'file'
      ? createFilePath(flattenedDataItem.path)
      : createFolderPath(flattenedDataItem.path);

  const selectionKey = path
    ? getKeyForSidebarSelection({
        ...path,
        id: flattenedDataItem.id,
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
      setSidebarSelection({
        selections: new Set([selectionKey]),
        anchorSelection: selectionKey,
      });
      return;
    }

    const result = computeShiftClickSelections({
      fileOrFolderMap,
      dataItem: flattenedDataItem,
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
   * Handles cmd+click for toggling selection of an item
   * It will un-select the item and update the anchor if it is already selected
   * It will select the item if it is not already selected
   */
  function handleMetaClick() {
    if (!selectionKey || !path) return;

    const selectableItem: SelectableItems = {
      ...path,
      id: flattenedDataItem.id,
    };
    const result = computeMetaClickState({
      fileOrFolderMap,
      dataItem: flattenedDataItem,
      selectionKey,
      currentSelections: sidebarSelection.selections,
    });

    if (result) {
      // Item was already selected, un-select it
      setSidebarSelection(result);
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
    setSidebarSelection({
      selections: new Set([]),
      anchorSelection: selectionKey,
    });
  }

  function handleSelectionClick(e: MouseEvent) {
    if (e.shiftKey) {
      handleShiftClick();
    } else if (e.metaKey || e.ctrlKey) {
      handleMetaClick();
    } else {
      handleDefaultClick();
    }
  }

  function handleContextMenuSelection() {
    if (!selectionKey || !path) return;
    const selectableItem: SelectableItems = {
      ...path,
      id: flattenedDataItem.id,
    };
    addToSidebarSelection(selectableItem);
  }

  return (
    <FileTreeItemContainer
      paddingLeft={paddingLeft}
      footer={
        isPending ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <LoadingSpinner className="ml-11 my-1.25" height={16} width={16} />
          </motion.div>
        ) : null
      }
    >
      {flattenedDataItem.type === 'folder' ? (
        <FileTreeFolderItem
          dataItem={flattenedDataItem}
          openFolder={openFolder}
          onSelectionClick={handleSelectionClick}
          onContextMenuSelection={handleContextMenuSelection}
          isSelectedFromSidebarClick={isSelectedFromSidebarClick}
        />
      ) : (
        <FileTreeFileItem
          dataItem={flattenedDataItem}
          onSelectionClick={handleSelectionClick}
          onContextMenuSelection={handleContextMenuSelection}
          isSelectedFromSidebarClick={isSelectedFromSidebarClick}
        />
      )}
    </FileTreeItemContainer>
  );
}
