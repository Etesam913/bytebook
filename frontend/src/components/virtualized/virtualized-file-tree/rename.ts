import type {
  FileTree as PierreFileTree,
  FileTreeRenameEvent,
} from '@pierre/trees';
import { createFilePath, splitPathSegments } from '@utils/path';
import type { RenameTreeItemPayload } from './hooks/tree-item-mutations';

/**
 * Persists a @pierre/trees inline rename to disk. The typed name is taken
 * literally — extension included for files.
 *
 * pierre fires `onRename` *before* applying the move to its own model, then
 * moves to `destinationPath` unconditionally; when the backend rejects the
 * rename the model is reverted so the tree matches disk again.
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

  const revert = () => {
    if (model.getItem(destinationPath) && !model.getItem(sourcePath)) {
      model.move(destinationPath, sourcePath);
    }
  };

  if (isFolder) {
    void renameTreeItem({
      itemType: 'folder',
      folderPath: sourcePath,
      newName,
    }).catch(revert);
    return;
  }

  // Files carry no trailing slash in pierre paths.
  const filePath = createFilePath(sourcePath);
  if (!filePath) return;
  void renameTreeItem({
    itemType: 'file',
    filePath,
    newName,
  }).catch(revert);
}
