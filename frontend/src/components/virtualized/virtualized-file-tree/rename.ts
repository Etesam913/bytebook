import type {
  FileTree as PierreFileTree,
  FileTreeRenameEvent,
} from '@pierre/trees';
import { createFilePath, splitPathSegments } from '../../../utils/path';
import type { RenameTreeItemPayload } from './hooks/tree-item-mutations';

/**
 * Persists a @pierre/trees inline rename to disk.
 *
 * pierre applies the rename to its own model *before* this runs, so the model
 * is corrected up-front when the typed name would not match what the backend
 * produces (the original extension always wins), and reverted when the backend
 * rejects the rename so the tree matches disk again.
 */
export function applyTreeRename({
  model,
  event,
  renameTreeItem,
}: {
  model: PierreFileTree;
  event: FileTreeRenameEvent;
  renameTreeItem: (payload: RenameTreeItemPayload) => Promise<unknown>;
}) {
  const { sourcePath, destinationPath, isFolder } = event;
  if (sourcePath === destinationPath) return;
  const newName = splitPathSegments(destinationPath).pop() ?? '';

  const revert = (appliedPath: string) => {
    if (model.getItem(appliedPath) && !model.getItem(sourcePath)) {
      model.move(appliedPath, sourcePath);
    }
  };

  if (isFolder) {
    void renameTreeItem({
      itemType: 'folder',
      folderPath: sourcePath,
      newName,
    }).catch(() => revert(destinationPath));
    return;
  }

  // Files carry no trailing slash in pierre paths.
  const filePath = createFilePath(sourcePath);
  if (!filePath) return;
  // The file keeps its original extension no matter what was typed:
  // strip it if present, otherwise treat the whole input as the name.
  const suffix = `.${filePath.extension}`;
  const typedName = newName.endsWith(suffix)
    ? newName.slice(0, -suffix.length)
    : newName;
  // The backend will produce `<parent>/<typedName><suffix>`. If that
  // differs from what pierre applied (extension edited or removed),
  // correct the model now so the follow-up watcher event is a no-op.
  const parentSegments = destinationPath.split('/').slice(0, -1);
  const actualDest = [...parentSegments, `${typedName}${suffix}`].join('/');
  let appliedPath = destinationPath;
  if (destinationPath !== actualDest && model.getItem(destinationPath)) {
    model.move(destinationPath, actualDest, { collision: 'skip' });
    appliedPath = actualDest;
  }
  void renameTreeItem({
    itemType: 'file',
    filePath,
    newName: typedName,
  }).catch(() => revert(appliedPath));
}
