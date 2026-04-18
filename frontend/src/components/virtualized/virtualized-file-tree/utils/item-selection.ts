import type { FileOrFolder, FlattenedFileOrFolder } from '../types';
import { isTreeNodeAFile, isTreeNodeAFolder } from './file-tree-utils';
import { createFilePath, createFolderPath } from '../../../../utils/path';
import {
  createSelectionKey,
  getSelectionValue,
  getKeyForSidebarSelection,
  FILE_SELECTION_PREFIX,
} from '../../../../utils/selection';
import type { SidebarSelectionState } from '../../../../atoms';

/**
 * Resolves file tree items that context menu actions should target.
 * If the current item is selected, all selected items are targeted.
 * Otherwise, only the current item is targeted.
 */
export function getContextMenuSelectionItems({
  currentItem,
  sidebarSelections,
  fileOrFolderMap,
}: {
  currentItem: FileOrFolder;
  sidebarSelections: Set<string>;
  fileOrFolderMap: Map<string, FileOrFolder>;
}): {
  selectedItems: FileOrFolder[];
  isCurrentItemSelected: boolean;
} {
  const currentSelectionKey = createSelectionKey(
    FILE_SELECTION_PREFIX,
    currentItem.id
  );
  const isCurrentItemSelected = sidebarSelections.has(currentSelectionKey);

  const activeSelectionKeys = isCurrentItemSelected
    ? sidebarSelections
    : new Set([currentSelectionKey]);

  const selectionItems = new Map<string, FileOrFolder>();
  for (const selectionKey of activeSelectionKeys) {
    const selectionId = getSelectionValue(selectionKey);
    if (!selectionId) continue;
    const item = fileOrFolderMap.get(selectionId);
    if (!item) continue;
    selectionItems.set(selectionId, item);
  }

  if (!selectionItems.has(currentItem.id)) {
    selectionItems.set(currentItem.id, currentItem);
  }

  return {
    selectedItems: [...selectionItems.values()],
    isCurrentItemSelected,
  };
}

/**
 * Finds the next anchor selection key after removing the current file from the selection.
 * It searches through sibling files in the parent folder, first looking forward from the
 * current position, then backward if no selection is found after.
 *
 * @param params.fileOrFolderMap - Map of file/folder IDs to their corresponding FileOrFolder objects
 * @param params.dataItem - The file item that was removed from selection
 * @param params.selectionKey - The selection key of the file that was removed
 * @param params.updatedSelections - The updated set of selection keys after removal
 * @returns The selection key to use as the new anchor, or null if none found
 */
function getAnchorAfterRemoval({
  fileOrFolderMap,
  dataItem,
  selectionKey,
  updatedSelections,
}: {
  fileOrFolderMap: Map<string, FileOrFolder>;
  dataItem: FlattenedFileOrFolder;
  selectionKey: string;
  updatedSelections: Set<string>;
}): string | null {
  if (!dataItem.parentId) {
    return null;
  }

  const parentFolder = fileOrFolderMap.get(dataItem.parentId);
  if (!parentFolder || !isTreeNodeAFolder(parentFolder)) {
    return null;
  }

  const orderedSelectionKeys: string[] = [];
  for (const childId of parentFolder.childrenIds) {
    const childItem = fileOrFolderMap.get(childId);
    if (!childItem) continue;
    const childPath = isTreeNodeAFile(childItem)
      ? createFilePath(childItem.path)
      : createFolderPath(childItem.path);
    if (!childPath) continue;
    orderedSelectionKeys.push(
      getKeyForSidebarSelection({
        ...childPath,
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
 * Computes the new selections for shift-click behavior by selecting a range of items
 * between the anchor index and the clicked index.
 *
 * @param params.fileOrFolderMap - Map of file/folder IDs to their corresponding FileOrFolder objects
 * @param params.dataItem - The file item that was clicked
 * @param params.anchorSelectionKey - The selection key of the anchor item
 * @returns An object containing the new selections set, or null if the operation is invalid
 */
export function computeShiftClickSelections({
  fileOrFolderMap,
  dataItem,
  anchorSelectionKey,
}: {
  fileOrFolderMap: Map<string, FileOrFolder>;
  dataItem: FlattenedFileOrFolder;
  anchorSelectionKey: string;
}): { selections: Set<string> } | null {
  const anchorSelectionId = getSelectionValue(anchorSelectionKey);
  if (!anchorSelectionId) {
    return null;
  }
  const anchorSelectionItem = fileOrFolderMap.get(anchorSelectionId);

  // You cannot select across parents using shift click
  if (
    !anchorSelectionItem ||
    !dataItem.parentId ||
    anchorSelectionItem.parentId !== dataItem.parentId
  ) {
    return null;
  }

  const parentFolder = fileOrFolderMap.get(dataItem.parentId);
  if (!parentFolder || !isTreeNodeAFolder(parentFolder)) {
    return null;
  }

  const startIndex = parentFolder.childrenIds.indexOf(anchorSelectionItem.id);
  const endIndex = parentFolder.childrenIds.indexOf(dataItem.id);
  if (startIndex === -1 || endIndex === -1) {
    return null;
  }

  const [rangeStart, rangeEnd] =
    startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

  const updatedSelections = new Set<string>();

  // Go through the range and select each file or folder in the range
  for (let index = rangeStart; index <= rangeEnd; index += 1) {
    const childId = parentFolder.childrenIds[index];
    const childItem = fileOrFolderMap.get(childId);
    if (!childItem) continue;

    const childPath = isTreeNodeAFile(childItem)
      ? createFilePath(childItem.path)
      : createFolderPath(childItem.path);
    if (!childPath) continue;

    updatedSelections.add(
      getKeyForSidebarSelection({
        ...childPath,
        id: childItem.id,
      })
    );
  }

  return { selections: updatedSelections };
}

/**
 * Computes the new sidebar selection state for meta-click (cmd+click) behavior.
 * If the file is already selected, it will be un-selected and the anchor will be updated.
 * If the file is not selected, this function returns null (the caller should add it to selection).
 *
 * @param params.fileOrFolderMap - Map of file/folder IDs to their corresponding FileOrFolder objects
 * @param params.dataItem - The file item that was clicked
 * @param params.selectionKey - The selection key of the clicked item
 * @param params.currentSelections - The current set of selection keys
 * @returns An object containing the new selections and anchor, or null if the file should be added to selection
 */
export function computeMetaClickState({
  fileOrFolderMap,
  dataItem,
  selectionKey,
  currentSelections,
}: {
  fileOrFolderMap: Map<string, FileOrFolder>;
  dataItem: FlattenedFileOrFolder;
  selectionKey: string;
  currentSelections: Set<string>;
}): { selections: Set<string>; anchorSelection: string | null } | null {
  if (!currentSelections.has(selectionKey)) {
    // File is not selected, caller should add it to selection
    return null;
  }

  // cmd+click on a selected file will un-select it
  // It also updates the anchor selection to the next item in the selection set
  // or the previous item if the next item is not selected
  const newSelections = new Set(currentSelections);
  newSelections.delete(selectionKey);

  const nextAnchor =
    getAnchorAfterRemoval({
      fileOrFolderMap,
      dataItem,
      selectionKey,
      updatedSelections: newSelections,
    }) ??
    newSelections.values().next().value ??
    null;

  return {
    selections: newSelections,
    anchorSelection: nextAnchor,
  };
}

/** SVG markup for folder icon used in drag ghost */
const FOLDER_SVG = `<svg style="width: 16px; height: 16px;" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
  <g fill="currentColor" stroke="currentColor">
    <path d="M1.75,7.75V3.75c0-.552,.448-1,1-1h3.797c.288,0,.563,.125,.753,.342l2.325,2.658" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>
    <rect height="9.5" width="14.5" fill="none" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" x="1.75" y="5.75"/>
  </g>
</svg>`;

/** SVG markup for page/note icon used in drag ghost */
const PAGE_SVG = `<svg style="width: 16px; height: 16px;" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
  <g fill="currentColor" stroke="currentColor">
    <line fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" x1="5.75" x2="9" y1="11.25" y2="11.25"/>
    <line fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" x1="5.75" x2="12.25" y1="8.25" y2="8.25"/>
    <line fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" x1="5.75" x2="12.25" y1="5.25" y2="5.25"/>
    <rect height="14.5" width="12.5" fill="none" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" x="2.75" y="1.75"/>
  </g>
</svg>`;

/**
 * Creates a ghost element for drag operations that displays a list of all selected items.
 * The element is appended to the document body during drag and should be removed after drag ends.
 */
export function createDragGhostElement({
  sidebarSelection,
  fileOrFolderMap,
}: {
  sidebarSelection: SidebarSelectionState;
  fileOrFolderMap: Map<string, FileOrFolder>;
}): HTMLElement {
  const ghostContainer = document.createElement('div');
  ghostContainer.id = 'file-tree-item';
  ghostContainer.className =
    'fixed top-[-1000px] left-[-1000px] bg-zinc-100 dark:bg-zinc-700 border-2 border-zinc-200 dark:border-zinc-650 px-2 py-1 rounded-md text-[13px] font-display shadow-sm pointer-events-none z-[9999] max-w-[250px] max-h-[300px] overflow-visible';

  const selections = sidebarSelection.selections;
  const draggedCount = selections.size;

  const countBadge = document.createElement('div');
  countBadge.className =
    'absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full text-white text-[11px] font-semibold flex items-center justify-center shadow';
  countBadge.style.backgroundColor = 'var(--accent-color)';
  countBadge.textContent = String(draggedCount);
  ghostContainer.appendChild(countBadge);

  const list = document.createElement('ul');
  list.className = 'list-none m-0 p-0';

  let count = 0;
  const maxVisibleItems = 10;

  for (const selectionKey of selections) {
    if (count >= maxVisibleItems) {
      const moreItem = document.createElement('li');
      moreItem.className = 'py-0.5 opacity-70 italic';
      moreItem.textContent = `and ${selections.size - maxVisibleItems} more items`;
      list.appendChild(moreItem);
      break;
    }

    const itemId = getSelectionValue(selectionKey);
    if (!itemId) continue;

    const item = fileOrFolderMap.get(itemId);
    if (!item) continue;

    const listItem = document.createElement('li');
    listItem.className =
      'py-0.5 flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis';

    const icon = document.createElement('span');
    icon.innerHTML = isTreeNodeAFolder(item) ? FOLDER_SVG : PAGE_SVG;
    icon.className = 'flex-shrink-0 flex items-center';

    const name = document.createElement('span');
    name.textContent = item.name;
    name.className = 'overflow-hidden text-ellipsis';

    listItem.appendChild(icon);
    listItem.appendChild(name);
    list.appendChild(listItem);
    count++;
  }

  ghostContainer.appendChild(list);
  return ghostContainer;
}
