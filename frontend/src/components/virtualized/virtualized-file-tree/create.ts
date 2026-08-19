import type {
  FileTree as PierreFileTree,
  FileTreeRenameEvent,
} from '@pierre/trees';
import { toast } from 'sonner';
import type { AddTreeItemVariables } from '@hooks/tree-items';
import { DEFAULT_SONNER_OPTIONS } from '@utils/general';
import { splitPathSegments } from '@utils/path';
import { QueryError } from '@utils/query';
import { FILE_TYPE, FOLDER_TYPE } from '@utils/tree-item-types';

export type TreeItemType = typeof FOLDER_TYPE | typeof FILE_TYPE;

/**
 * Picks a unique placeholder path for the inline create flow. Pure so it can
 * be unit-tested without a model — callers pass
 * `(path) => model.getItem(path) !== null`. `model.add` throws on duplicate
 * paths, so the scan must cover every colliding representation: the bare
 * name, the directory form, and (for notes) the on-disk `.md` name the
 * placeholder will be moved to after creation.
 */
export function getPlaceholderPath({
  parentPath,
  itemType,
  hasItem,
}: {
  /** pierre folder path, trailing slash included */
  parentPath: string;
  itemType: TreeItemType;
  hasItem: (path: string) => boolean;
}): string {
  for (let i = 1; ; i++) {
    const name = i === 1 ? 'Untitled' : `Untitled ${i}`;
    const base = `${parentPath}${name}`;
    if (itemType === FOLDER_TYPE) {
      if (!hasItem(`${base}/`) && !hasItem(base)) return `${base}/`;
    } else if (
      !hasItem(base) &&
      !hasItem(`${base}.md`) &&
      !hasItem(`${base}/`)
    ) {
      return base;
    }
  }
}

/**
 * Persists a committed inline-create placeholder as a real folder or note.
 * Runs after pierre's own commit-move, so the model already holds
 * `destinationPath`. The mutation validates the typed name, creates the item
 * on disk, and navigates to it; the watcher's `folder:create` / `file:create`
 * event then finds the path already in the model and skips it, so nothing is
 * double-added.
 */
export function applyTreeCreate({
  model,
  event,
  parentFolderPath,
  addTreeItem,
}: {
  model: PierreFileTree;
  event: FileTreeRenameEvent;
  parentFolderPath: string;
  addTreeItem: (variables: AddTreeItemVariables) => Promise<unknown>;
}) {
  const { destinationPath, isFolder } = event;
  const typedName = splitPathSegments(destinationPath).pop() ?? '';
  // AddNoteToFolder appends `.md` itself, so a typed extension is stripped.
  const newName = isFolder ? typedName : typedName.replace(/\.md$/i, '');

  const removePlaceholder = () => {
    if (model.getItem(destinationPath)) {
      model.remove(destinationPath, isFolder ? { recursive: true } : undefined);
    }
  };

  void addTreeItem({
    parentFolderPath,
    addType: isFolder ? FOLDER_TYPE : FILE_TYPE,
    newName,
  })
    .then(() => {
      // A committed folder path already matches the watcher's event path.
      if (isFolder) return;
      // Disk gets `<name>.md`; align the model with the on-disk path.
      const realPath = `${parentFolderPath}${newName}.md`;
      if (model.getItem(realPath)) {
        removePlaceholder(); // the watcher event landed first
      } else if (model.getItem(destinationPath)) {
        model.move(destinationPath, realPath);
      }
    })
    .catch((error: unknown) => {
      removePlaceholder();
      // QueryErrors already toast via the global MutationCache handler.
      if (error instanceof Error && !(error instanceof QueryError)) {
        toast.error(error.message, DEFAULT_SONNER_OPTIONS);
      }
    });
}
