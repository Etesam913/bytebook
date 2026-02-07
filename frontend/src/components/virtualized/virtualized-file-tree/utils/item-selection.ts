import type { FileOrFolder, FlattenedFileOrFolder } from '../types';
import { createFilePath, createFolderPath } from '../../../../utils/path';
import {
  getFileSelectionKey,
  getKeyForSidebarSelection,
} from '../../../../utils/selection';
import type { SidebarSelection } from '../../../../hooks/selection';

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
export function getAnchorAfterRemoval({
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
  if (!parentFolder || parentFolder.type !== 'folder') {
    return null;
  }

  const orderedSelectionKeys: string[] = [];
  for (const childId of parentFolder.childrenIds) {
    const childItem = fileOrFolderMap.get(childId);
    if (!childItem) continue;
    const childPath =
      childItem.type === 'file'
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
  const anchorSelectionId = getFileSelectionKey(anchorSelectionKey);
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
  if (!parentFolder || parentFolder.type !== 'folder') {
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

    const childPath =
      childItem.type === 'file'
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
    (newSelections.values().next().value as string | undefined) ??
    null;

  return {
    selections: newSelections,
    anchorSelection: nextAnchor,
  };
}

/**
 * Creates a ghost element for drag operations that displays a list of all selected items.
 * The element is appended to the document body during drag and should be removed after drag ends.
 */
export function createDragGhostElement({
  sidebarSelection,
  fileOrFolderMap,
}: {
  sidebarSelection: SidebarSelection;
  fileOrFolderMap: Map<string, FileOrFolder>;
}): HTMLElement {
  const ghostContainer = document.createElement('div');
  ghostContainer.id = 'drag-ghost';
  ghostContainer.style.cssText = `
    position: fixed;
    top: -1000px;
    left: -1000px;
    background: var(--ghost-bg, #27272a);
    color: var(--ghost-text, #fff);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-family: system-ui, -apple-system, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    pointer-events: none;
    z-index: 9999;
    max-width: 250px;
    max-height: 200px;
    overflow: hidden;
  `;

  const selections = sidebarSelection.selections;

  const list = document.createElement('ul');
  list.style.cssText = `
    list-style: none;
    margin: 0;
    padding: 0;
  `;

  let count = 0;
  const maxVisibleItems = 5;

  for (const selectionKey of selections) {
    if (count >= maxVisibleItems) {
      const moreItem = document.createElement('li');
      moreItem.style.cssText = `
        padding: 2px 0;
        opacity: 0.7;
        font-style: italic;
      `;
      moreItem.textContent = `... and ${selections.size - maxVisibleItems} more`;
      list.appendChild(moreItem);
      break;
    }

    const itemId = getFileSelectionKey(selectionKey);
    if (!itemId) continue;

    const item = fileOrFolderMap.get(itemId);
    if (!item) continue;

    const listItem = document.createElement('li');
    listItem.style.cssText = `
      padding: 2px 0;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    const icon = document.createElement('span');
    icon.textContent = item.type === 'folder' ? '📁' : '📄';
    icon.style.cssText = `flex-shrink: 0;`;

    const name = document.createElement('span');
    name.textContent = item.name;
    name.style.cssText = `
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    listItem.appendChild(icon);
    listItem.appendChild(name);
    list.appendChild(listItem);
    count++;
  }

  ghostContainer.appendChild(list);
  return ghostContainer;
}
