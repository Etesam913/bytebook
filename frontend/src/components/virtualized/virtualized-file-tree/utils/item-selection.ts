import type { FileOrFolder, FlattenedFileOrFolder } from '../types';
import { createFilePath } from '../../../../utils/path';
import {
  getFileSelectionKey,
  getKeyForSidebarSelection,
} from '../../../../utils/selection';

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

    const childFilePath = createFilePath(childItem.id);
    if (!childFilePath) continue;

    updatedSelections.add(
      getKeyForSidebarSelection({
        ...childFilePath,
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
