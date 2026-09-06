import {
  prepareFileTreeInput,
  type FileTree as PierreFileTree,
  type FileTreeBatchOperation,
} from '@pierre/trees';
import {
  getSortedTreePaths,
  isDirectoryHandle,
  setSortedTreePaths,
} from './model-utils';

// Compare the authoritative snapshot with current model membership, including optimistic moves.
export function reconcileTreePaths(
  model: PierreFileTree,
  allPaths: readonly string[]
) {
  // The prepared input's paths are in the tree's final row order — the
  // scroll-into-view helper needs it to map a path to a row index.
  const preparedNext = prepareFileTreeInput(allPaths);

  const next = new Set(allPaths);
  // Skip paths the watcher events already applied — add/remove throw on
  // duplicate/unknown paths.
  const added = allPaths.filter((path) => !model.getItem(path));
  const currentModelPaths = getSortedTreePaths(model) ?? [];
  const removedWithChildren = currentModelPaths.filter(
    (path) => !next.has(path) && model.getItem(path) !== null
  );
  // A recursive folder remove takes its children with it, so drop child
  // paths whose ancestor folder is also being removed.
  const removedFolders = removedWithChildren.filter((path) =>
    path.endsWith('/')
  );
  const removed = removedWithChildren.filter(
    (path) =>
      !removedFolders.some(
        (folder) => folder !== path && path.startsWith(folder)
      )
  );
  if (added.length === 0 && removed.length === 0) {
    setSortedTreePaths(model, preparedNext.paths);
    return;
  }

  // A vault-sized diff (e.g. a project switch) is cheaper as a coarse
  // reset. resetPaths re-maps selection and focus itself, so no manual
  // restore is needed.
  if (added.length + removed.length > allPaths.length / 2) {
    const expandedDirectories = allPaths.filter((path) => {
      if (!path.endsWith('/')) return false;
      const item = model.getItem(path);
      return item !== null && isDirectoryHandle(item) && item.isExpanded();
    });
    setSortedTreePaths(model, preparedNext.paths);
    model.resetPaths(allPaths, {
      preparedInput: preparedNext,
      initialExpandedPaths: expandedDirectories,
    });
    return;
  }

  const operations: FileTreeBatchOperation[] = [
    ...removed.map((path) => ({
      type: 'remove' as const,
      path,
      recursive: path.endsWith('/'),
    })),
    ...added.map((path) => ({ type: 'add' as const, path })),
  ];
  model.batch(operations);
  setSortedTreePaths(model, preparedNext.paths);
}
