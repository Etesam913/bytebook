import type {
  FileTree as PierreFileTree,
  FileTreeRenameEvent,
} from '@pierre/trees';
import { toast } from 'sonner';
import type { AddTreeItemVariables } from '@hooks/tree-items';
import { DEFAULT_SONNER_OPTIONS } from '@utils/general';
import { createFolderPath, splitPathSegments } from '@utils/path';
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

function removeItemIfPresent({
  model,
  path,
  isFolder,
}: {
  model: PierreFileTree;
  path: string;
  isFolder: boolean;
}) {
  if (model.getItem(path)) {
    model.remove(path, isFolder ? { recursive: true } : undefined);
  }
}

// Moves the placeholder onto its `.md` path before the RPC, so a watcher event
// announcing that path and the RPC response both resolve to the same row.
function canonicalizePlaceholder({
  model,
  placeholderPath,
  realPath,
  pendingPaths,
  onCanonicalPath,
}: {
  model: PierreFileTree;
  placeholderPath: string;
  realPath: string;
  pendingPaths: Set<string>;
  onCanonicalPath: (path: string) => void;
}): string {
  if (
    placeholderPath === realPath ||
    model.getItem(realPath) ||
    !model.getItem(placeholderPath)
  ) {
    return placeholderPath;
  }
  onCanonicalPath(realPath);
  model.move(placeholderPath, realPath);
  pendingPaths.delete(placeholderPath);
  pendingPaths.add(realPath);
  return realPath;
}

// Runs after the RPC: if the watcher already added the real row, drop the
// placeholder; otherwise move the placeholder into place.
function settlePlaceholder({
  model,
  placeholderPath,
  realPath,
  isFolder,
  onCanonicalPath,
}: {
  model: PierreFileTree;
  placeholderPath: string;
  realPath: string;
  isFolder: boolean;
  onCanonicalPath: (path: string) => void;
}) {
  if (model.getItem(realPath)) {
    removeItemIfPresent({ model, path: placeholderPath, isFolder });
  } else if (model.getItem(placeholderPath)) {
    onCanonicalPath(realPath);
    model.move(placeholderPath, realPath);
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
export async function applyTreeCreate({
  model,
  event,
  parentFolderPath,
  addTreeItem,
  pendingPaths,
  onCanonicalPath,
}: {
  model: PierreFileTree;
  event: FileTreeRenameEvent;
  parentFolderPath: string;
  addTreeItem: (variables: AddTreeItemVariables) => Promise<unknown>;
  pendingPaths: Set<string>;
  onCanonicalPath: (path: string) => void;
}) {
  const { destinationPath, isFolder } = event;
  const typedName = splitPathSegments(destinationPath).pop() ?? '';
  // AddNoteToFolder appends `.md` itself, so a typed extension is stripped.
  const newName = isFolder ? typedName : typedName.replace(/\.md$/i, '');
  // Pierre's rename event omits the folder marker, but reconciliation must
  // retain a directory path, never introduce a same-named file alongside it.
  let placeholderPath = isFolder
    ? (createFolderPath(destinationPath)?.fullPath ?? destinationPath)
    : destinationPath;
  const realPath = isFolder
    ? placeholderPath
    : `${parentFolderPath}${newName}.md`;
  pendingPaths.add(placeholderPath);

  try {
    placeholderPath = canonicalizePlaceholder({
      model,
      placeholderPath,
      realPath,
      pendingPaths,
      onCanonicalPath,
    });
    await addTreeItem({
      parentFolderPath,
      addType: isFolder ? FOLDER_TYPE : FILE_TYPE,
      newName,
    });
    if (placeholderPath !== realPath) {
      settlePlaceholder({
        model,
        placeholderPath,
        realPath,
        isFolder,
        onCanonicalPath,
      });
    }
  } catch (error: unknown) {
    removeItemIfPresent({ model, path: placeholderPath, isFolder });
    // QueryErrors already toast via the global MutationCache handler.
    if (error instanceof Error && !(error instanceof QueryError)) {
      toast.error(error.message, DEFAULT_SONNER_OPTIONS);
    }
  } finally {
    pendingPaths.delete(placeholderPath);
  }
}
