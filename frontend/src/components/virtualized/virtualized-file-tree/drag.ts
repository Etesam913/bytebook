import type { FileTree as PierreFileTree } from '@pierre/trees';
import { FILE_TREE_GHOST_ID } from '@components/editor/utils/drag/context';
import { WAILS_URL } from '@utils/general';
import { createFilePath, createFolderPath } from '@utils/path';

// The editor identifies file-tree drags by this id on draggedGhostElementAtom.
// Pierre owns the real drag image, so a detached marker element is enough.
export function createFileTreeDragMarker(): HTMLElement {
  const marker = document.createElement('div');
  marker.id = FILE_TREE_GHOST_ID;
  return marker;
}

function toWailsUrl(treePath: string): string | null {
  if (treePath.endsWith('/')) {
    const folderPath = createFolderPath(treePath);
    // Trailing slash tells parseDraggedFile this is a folder.
    return folderPath ? `${WAILS_URL}${folderPath.encodedFolderUrl}/` : null;
  }
  const filePath = createFilePath(treePath);
  return filePath ? `${WAILS_URL}${filePath.encodedFileUrl}` : null;
}

// text/plain payload consumed by parseDraggedFile in the editor.
export function buildFileTreeDragPayload(paths: readonly string[]): string {
  return paths
    .map(toWailsUrl)
    .filter((url): url is string => url !== null)
    .join(',');
}

// Pierre leaves the dragged row selected after a drag ends. Put the selection
// back on the route's row without scrolling; the deselect/select emissions
// never route because onSelectionChange ignores the current route path.
export function restoreSelectionAfterDrag(
  model: PierreFileTree,
  routeTargetPath: string | null
) {
  for (const selectedPath of model.getSelectedPaths()) {
    if (selectedPath !== routeTargetPath) {
      model.getItem(selectedPath)?.deselect();
    }
  }
  if (routeTargetPath) model.getItem(routeTargetPath)?.select();
}
