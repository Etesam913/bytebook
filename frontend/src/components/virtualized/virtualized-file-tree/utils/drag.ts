import { createFilePath, createFolderPath } from '../../../../utils/path';
import { WAILS_URL } from '../../../../utils/general';
import { getSelectionValue } from '../../../../utils/selection';
import type { SidebarSelectionState } from '../../../../atoms';
import type { FileOrFolder } from '../types';
import { isTreeNodeAFolder } from './file-tree-utils';
import { createDragGhostElement } from './item-selection';
import { DragEvent } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/** Id used to mark the file-tree drag ghost so the editor can branch on it. */
export const FILE_TREE_GHOST_ID = 'file-tree-item';

function buildWailsUrlForItem(item: FileOrFolder): string | null {
  if (isTreeNodeAFolder(item)) {
    const folderPath = createFolderPath(item.path);
    if (!folderPath) return null;
    // Trailing slash signals "folder" to parseDraggedFile so it doesn't have
    // to guess from the path (extensionless files and dotted folder names
    // both break the dot heuristic).
    return `${WAILS_URL}${folderPath.encodedFolderUrl}/`;
  }
  const filePath = createFilePath(item.path);
  if (!filePath) return null;
  return `${WAILS_URL}${filePath.encodedFileUrl}`;
}

/**
 * Starts a drag from the file tree. Builds the drag ghost element, writes the
 * selected item URLs onto the `DataTransfer` (so other surfaces can receive a
 * plain-text drop), sets the ghost as the drag image, and stores it in the
 * shared atom so the editor can branch its dragover/drop handling.
 */
export function handleFileTreeDragStart({
  e,
  sidebarSelection,
  fileOrFolderMap,
  setDraggedGhostElement,
}: {
  e: DragEvent;
  sidebarSelection: SidebarSelectionState;
  fileOrFolderMap: Map<string, FileOrFolder>;
  setDraggedGhostElement: Dispatch<SetStateAction<HTMLElement | null>>;
}) {
  const ghost = createDragGhostElement({
    sidebarSelection,
    fileOrFolderMap,
  });
  document.body.appendChild(ghost);

  const urls: string[] = [];
  for (const selectionKey of sidebarSelection.selections) {
    const itemId = getSelectionValue(selectionKey);
    if (!itemId) continue;
    const item = fileOrFolderMap.get(itemId);
    if (!item) continue;
    const url = buildWailsUrlForItem(item);
    if (url) urls.push(url);
  }

  e.dataTransfer.setData('text/plain', urls.join(','));
  e.dataTransfer.effectAllowed = 'copyMove';
  e.dataTransfer.setDragImage(ghost, 0, 0);

  setDraggedGhostElement(ghost);
}

export function handleFileTreeDragEnd({
  e,
  setDraggedGhostElement,
  setSidebarSelection,
}: {
  e: React.DragEvent;
  setDraggedGhostElement: Dispatch<SetStateAction<HTMLElement | null>>;
  setSidebarSelection: Dispatch<SetStateAction<SidebarSelectionState>>;
}) {
  const ghost = document.getElementById(FILE_TREE_GHOST_ID);
  if (ghost) {
    ghost.remove();
  }
  setDraggedGhostElement(null);

  // Clear file-tree selection after a successful drop (anywhere — editor,
  // another folder, etc). dropEffect is 'none' if the drag was cancelled.
  if (e.dataTransfer.dropEffect !== 'none') {
    setSidebarSelection({ selections: new Set(), anchorSelection: null });
  }
}
