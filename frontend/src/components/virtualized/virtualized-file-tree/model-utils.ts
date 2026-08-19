import {
  prepareFileTreeInput,
  type FileTree as PierreFileTree,
  type FileTreeDirectoryHandle,
  type FileTreeItemHandle,
  type FileTreeMutationEvent,
} from '@pierre/trees';
import {
  createFilePath,
  createFolderPath,
  splitPathSegments,
} from '@utils/path';
import { navigateToPath } from '@utils/routes';

export function navigateToTreePath(path: string) {
  const targetPath = path.endsWith('/')
    ? createFolderPath(path)
    : createFilePath(path);
  if (!targetPath) return;
  navigateToPath(targetPath);
}

/**
 * Narrows a `FileTreeItemHandle` to its directory variant. The union is
 * discriminated by `isDirectory()`'s literal return type, which TypeScript
 * only applies through a user-defined type guard like this one.
 */
export function isDirectoryHandle(
  item: FileTreeItemHandle
): item is FileTreeDirectoryHandle {
  return item.isDirectory();
}

/**
 * The tree's row order, as sorted by `prepareFileTreeInput`. Kept here so the
 * scroll helper can translate a path into a visible row index without access
 * to the package's internal controller (which exposes no public reveal API).
 * Keyed by model so the order can never leak between instances and is
 * collected along with the model itself.
 */
const sortedPathsByModel = new WeakMap<PierreFileTree, readonly string[]>();

export function setSortedTreePaths(
  model: PierreFileTree,
  paths: readonly string[]
) {
  sortedPathsByModel.set(model, paths);
}

// Seeds the row order at model construction. No-op when an entry already
// exists — an <Activity> re-mount must not clobber a fresher list with the
// stale construction-time one.
export function initializeSortedTreePaths(
  model: PierreFileTree,
  paths: readonly string[]
) {
  if (!sortedPathsByModel.has(model)) {
    sortedPathsByModel.set(model, paths);
  }
}

/**
 * Folds a model mutation (watcher batch, drag move, inline rename) into the
 * stored row order so scroll-into-view stays accurate between `allPaths`
 * refetches. Idempotent against paths the refetch sync already applied.
 */
export function applySortedTreePathMutation(
  model: PierreFileTree,
  event: FileTreeMutationEvent
): void {
  if (event.operation === 'batch') {
    for (const semanticEvent of event.events) {
      applySortedTreePathMutation(model, semanticEvent);
    }
    return;
  }
  const current = sortedPathsByModel.get(model);
  if (!current) return;
  switch (event.operation) {
    case 'add': {
      if (current.includes(event.path)) return;
      sortedPathsByModel.set(
        model,
        prepareFileTreeInput([...current, event.path]).paths
      );
      return;
    }
    case 'remove': {
      sortedPathsByModel.set(
        model,
        current.filter(
          (path) =>
            path !== event.path &&
            !(event.recursive && path.startsWith(event.path))
        )
      );
      return;
    }
    case 'move': {
      const { from, to } = event;
      const moved = current.map((path) => {
        if (path === from) return to;
        if (from.endsWith('/') && path.startsWith(from)) {
          return to + path.slice(from.length);
        }
        return path;
      });
      sortedPathsByModel.set(model, prepareFileTreeInput(moved).paths);
      return;
    }
    case 'reset': {
      // `useSyncAllPaths` writes the full sorted list before calling
      // resetPaths, so there is nothing to derive from the event.
      return;
    }
  }
}

function getShadowRoot(model: PierreFileTree | null): ShadowRoot | null {
  if (!model) return null;
  const container = model.getFileTreeContainer();
  if (!container) return null;
  const root = container.getRootNode();
  return container.shadowRoot ?? (root instanceof ShadowRoot ? root : null);
}

/**
 * The tree's host element: the shadow root's host when the tree renders into
 * one, otherwise the container itself. Events from inside the shadow root are
 * retargeted to this element by the time they reach React's handlers.
 */
export function getTreeHost(model: PierreFileTree): Element | null {
  const container = model.getFileTreeContainer();
  if (!container) return null;
  const root = container.getRootNode();
  return root instanceof ShadowRoot ? root.host : container;
}

function isExpandedDirectory(
  model: PierreFileTree,
  directoryPath: string
): boolean {
  const item = model.getItem(directoryPath);
  if (item === null || !isDirectoryHandle(item)) return false;
  return item.isExpanded();
}

/**
 * Index of `targetPath` among the currently visible rows: walk the sorted
 * path list in tree order, skipping the subtrees of collapsed directories.
 * Returns -1 when the path is hidden (a collapsed ancestor) or unknown.
 */
function getVisibleRowIndex(model: PierreFileTree, targetPath: string): number {
  let index = 0;
  let collapsedPrefix: string | null = null;
  for (const path of sortedPathsByModel.get(model) ?? []) {
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
  return (
    getShadowRoot(model)?.querySelector<HTMLInputElement>(
      '[data-item-rename-input]'
    ) ?? null
  );
}

/**
 * Makes the row for `targetPath` the tree's highlighted row: expands collapsed
 * ancestors (focus/selection alone never do), moves selection and focus to it,
 * and scrolls it into view. No-op if the path is not in the model.
 */
export function revealTreePath(
  model: PierreFileTree,
  targetPath: string
): void {
  const item = model.getItem(targetPath);
  if (!item) return;

  const segments = splitPathSegments(targetPath);
  for (let i = 1; i < segments.length; i++) {
    const ancestor = `${segments.slice(0, i).join('/')}/`;
    const ancestorItem = model.getItem(ancestor);
    if (
      ancestorItem !== null &&
      isDirectoryHandle(ancestorItem) &&
      !ancestorItem.isExpanded()
    ) {
      ancestorItem.expand();
    }
  }

  for (const selectedPath of model.getSelectedPaths()) {
    if (selectedPath !== targetPath) {
      model.getItem(selectedPath)?.deselect();
    }
  }
  item.select();
  if (model.getFocusedPath() !== targetPath) {
    model.focusPath(targetPath);
  }
  scrollTreePathIntoView(model, targetPath);
}
