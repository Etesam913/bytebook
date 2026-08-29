import { WAILS_URL } from '@utils/general';
import { safeDecodeURIComponent } from '@utils/path';

export type FolderDropAction = {
  type: 'move-tree-items';
  itemPaths: string[];
};

/**
 * Converts the file tree's `text/plain` drag payload (comma-joined wails
 * urls built by `buildFileTreeDragPayload`) back into vault-relative tree
 * paths. Folders keep their trailing slash so callers can tell them apart.
 */
export function parseFileTreeDropPayload(rawData: string): string[] {
  return rawData
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith(WAILS_URL))
    .flatMap((url) => {
      let path = safeDecodeURIComponent(url.slice(WAILS_URL.length));
      if (path.startsWith('/notes/')) path = path.slice('/notes/'.length);
      return path === '' || path === '/' ? [] : [path];
    });
}

/**
 * Decides what a DOM drop over the folder view should do. OS files never
 * reach the DOM `drop` event under Wails (the native runtime delivers them
 * through `FOLDER_CONTENT_DROP`), so only file-tree drags are handled here.
 */
export function resolveFolderDrop({
  dataTransfer,
  isFileTreeDrag,
}: {
  dataTransfer: DataTransfer | null;
  isFileTreeDrag: boolean;
}): FolderDropAction | null {
  if (!dataTransfer || !isFileTreeDrag) return null;
  const itemPaths = parseFileTreeDropPayload(
    dataTransfer.getData('text/plain')
  );
  if (itemPaths.length === 0) return null;
  return { type: 'move-tree-items', itemPaths };
}

export function isPointInsideElement({
  element,
  x,
  y,
}: {
  element: Element;
  x: number;
  y: number;
}): boolean {
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
