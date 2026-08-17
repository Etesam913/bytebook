import type {
  FileTree as PierreFileTree,
  FileTreeDirectoryHandle,
} from '@pierre/trees';

/**
 * The tree's row order, as sorted by `prepareFileTreeInput`. Kept here so the
 * scroll helper can translate a path into a visible row index without access
 * to the package's internal controller (which exposes no public reveal API).
 */
let sortedTreePaths: readonly string[] = [];

export function setSortedTreePaths(paths: readonly string[]) {
  sortedTreePaths = paths;
}

function getShadowRoot(model: PierreFileTree | null): ShadowRoot | null {
  if (!model) return null;
  const container = model.getFileTreeContainer();
  if (!container) return null;
  return (
    container.shadowRoot ??
    (container.getRootNode() instanceof ShadowRoot
      ? (container.getRootNode() as ShadowRoot)
      : null)
  );
}

function isExpandedDirectory(
  model: PierreFileTree,
  directoryPath: string
): boolean {
  const item = model.getItem(directoryPath);
  if (item === null || !item.isDirectory()) return false;
  return (item as FileTreeDirectoryHandle).isExpanded();
}

/**
 * Index of `targetPath` among the currently visible rows: walk the sorted
 * path list in tree order, skipping the subtrees of collapsed directories.
 * Returns -1 when the path is hidden (a collapsed ancestor) or unknown.
 */
function getVisibleRowIndex(model: PierreFileTree, targetPath: string): number {
  let index = 0;
  let collapsedPrefix: string | null = null;
  for (const path of sortedTreePaths) {
    if (collapsedPrefix !== null) {
      if (path.startsWith(collapsedPrefix)) continue;
      collapsedPrefix = null;
    }
    if (path === targetPath) return index;
    index++;
    if (path.endsWith('/') && !isExpandedDirectory(model, path)) {
      collapsedPrefix = path;
    }
  }
  return -1;
}

/**
 * Scrolls the row for `targetPath` into view (centered) if it is not already
 * visible in the viewport. The package scrolls only on user-driven focus
 * changes, so a freshly (re)mounted view starts at the top regardless of
 * which row is focused — this covers reveals and deep links.
 */
export function scrollTreePathIntoView(
  model: PierreFileTree,
  targetPath: string
): void {
  const rowIndex = getVisibleRowIndex(model, targetPath);
  if (rowIndex < 0) return;
  const scrollElement = getShadowRoot(model)?.querySelector<HTMLElement>(
    '[data-file-tree-virtualized-scroll="true"]'
  );
  if (!scrollElement) return;
  const itemHeight = model.getItemHeight();
  const rowTop = rowIndex * itemHeight;
  const viewTop = scrollElement.scrollTop;
  const viewHeight = scrollElement.clientHeight;
  const isRowInView =
    rowTop >= viewTop && rowTop + itemHeight <= viewTop + viewHeight;
  if (isRowInView) return;
  scrollElement.scrollTop = Math.max(
    0,
    rowTop - viewHeight / 2 + itemHeight / 2
  );
}

/**
 * Returns the inline rename input if the tree is currently in renaming mode.
 * @pierre/trees exposes no public "is renaming" getter, but the rename editor
 * renders inside the tree's shadow root with a stable data attribute.
 */
export function getRenameInput(
  model: PierreFileTree | null
): HTMLInputElement | null {
  if (!model) return null;
  const container = model.getFileTreeContainer();
  if (!container) return null;
  const root =
    container.shadowRoot ??
    (container.getRootNode() instanceof ShadowRoot
      ? (container.getRootNode() as ShadowRoot)
      : null);
  return (
    root?.querySelector<HTMLInputElement>('[data-item-rename-input]') ?? null
  );
}
