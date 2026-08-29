import type { FileTree as PierreFileTree } from '@pierre/trees';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Folder } from '@/icons/folder';
import { Note } from '@/icons/page';
import { FILE_TREE_GHOST_ID } from '@components/editor/utils/drag/context';
import { WAILS_URL } from '@utils/general';
import {
  createFilePath,
  createFolderPath,
  splitPathSegments,
} from '@utils/path';

// Pierre keeps the route's row selected as the active-item highlight, so a
// multi-select drag would otherwise always carry the open note along.
export function excludeActiveItemFromDrag(
  paths: readonly string[],
  routeTargetPath: string | null
): readonly string[] {
  const others = paths.filter((path) => path !== routeTargetPath);
  return others.length > 0 ? others : paths;
}

const MAX_GHOST_ROWS = 10;

export function getTreeItemName(path: string): string {
  return splitPathSegments(path).at(-1) ?? path;
}

function DragGhostRows({ paths }: { paths: readonly string[] }) {
  const hiddenCount = paths.length - MAX_GHOST_ROWS;
  return (
    <>
      {paths.slice(0, MAX_GHOST_ROWS).map((path) => (
        <span key={path} className="flex items-center gap-1.5">
          {path.endsWith('/') ? (
            <Folder width="1rem" height="1rem" className="shrink-0" />
          ) : (
            <Note width="1rem" height="1rem" className="shrink-0" />
          )}
          <span className="truncate">{getTreeItemName(path)}</span>
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="opacity-70">+{hiddenCount} more</span>
      )}
    </>
  );
}

// Pierre skips its custom drag image on WebKit, leaving the default snapshot
// of the grabbed row, which hides the rest of a multi-select. The editor
// identifies file-tree drags by FILE_TREE_GHOST_ID on draggedGhostElementAtom.
// Rendered synchronously because setDragImage must see the element during
// dragstart; `destroy` unmounts the root and removes the element.
export function createFileTreeDragGhost({
  paths,
  isDarkModeOn,
}: {
  paths: readonly string[];
  isDarkModeOn: boolean;
}): { element: HTMLElement; destroy: () => void } {
  const element = document.createElement('div');
  element.id = FILE_TREE_GHOST_ID;
  element.className =
    'absolute top-0 left-[-9999px] pointer-events-none flex flex-col gap-1.5 rounded-lg border-2 px-2.5 py-1.5 text-sm whitespace-nowrap shadow-md';
  Object.assign(element.style, {
    colorScheme: isDarkModeOn ? 'dark' : 'light',
    backgroundColor: 'light-dark(rgb(252, 252, 252), rgb(39, 39, 42))',
    color: 'light-dark(rgb(9, 9, 11), rgb(244, 244, 245))',
    borderColor: 'light-dark(rgb(228, 228, 231), rgb(82, 82, 91))',
    fontFamily: 'var(--app-font-family)',
    maxWidth: '20rem',
  });
  const root = createRoot(element);
  flushSync(() => root.render(<DragGhostRows paths={paths} />));
  return {
    element,
    destroy: () => {
      root.unmount();
      element.remove();
    },
  };
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
