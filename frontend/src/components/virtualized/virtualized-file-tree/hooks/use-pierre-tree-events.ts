import type {
  FileTree as PierreFileTree,
  FileTreeBatchOperation,
} from '@pierre/trees';
import { useWailsEvent } from '@hooks/events';
import {
  FILE_CREATE,
  FILE_DELETE,
  FILE_RENAME,
  FOLDER_CREATE,
  FOLDER_DELETE,
  FOLDER_RENAME,
} from '@utils/events';

/**
 * The frontend (and @pierre/trees) mark directories with a trailing slash,
 * but the Go file-watcher payloads always send slashless paths — this is the
 * Go → frontend boundary where the folder marker is restored.
 */
function toPierrePath(rawPath: string): string {
  if (!rawPath || rawPath.endsWith('/')) return rawPath;
  return `${rawPath}/`;
}

/**
 * Pipes the Wails file-watcher events into the @pierre/trees model so the
 * visible tree stays in sync with disk state. Uses the pierre model api
 * to make optimistic updates.
 */
export function usePierreTreeEvents(model: PierreFileTree | null) {
  useWailsEvent(FOLDER_CREATE, (body) =>
    handleCreate({
      model,
      paths: body.data.map((item) => toPierrePath(item.folderPath)),
    })
  );
  useWailsEvent(FILE_CREATE, (body) =>
    handleCreate({ model, paths: body.data.map((item) => item.filePath) })
  );
  useWailsEvent(FOLDER_DELETE, (body) =>
    handleDelete({
      model,
      paths: body.data.map((item) => toPierrePath(item.folderPath)),
      recursive: true,
    })
  );
  useWailsEvent(FILE_DELETE, (body) =>
    handleDelete({
      model,
      paths: body.data.map((item) => item.filePath),
      recursive: false,
    })
  );
  useWailsEvent(FOLDER_RENAME, (body) =>
    handleRename({
      model,
      renames: body.data.map((item) => ({
        oldPath: toPierrePath(item.oldFolderPath),
        newPath: toPierrePath(item.newFolderPath),
      })),
    })
  );
  useWailsEvent(FILE_RENAME, (body) =>
    handleRename({
      model,
      renames: body.data.map((item) => ({
        oldPath: item.oldFilePath,
        newPath: item.newFilePath,
      })),
    })
  );
}

function handleCreate({
  model,
  paths,
}: {
  model: PierreFileTree | null;
  paths: string[];
}) {
  if (!model) return;
  const ops = paths
    .filter((path) => path && !model.getItem(path))
    .map((path) => ({ type: 'add' as const, path }));
  if (ops.length === 0) return;
  model.batch(ops);
  // A newly created item is navigated to before this event inserts its row;
  // `usePierreRouteFocus` reveals it once the refetched path list lands.
}

function handleDelete({
  model,
  paths,
  recursive,
}: {
  model: PierreFileTree | null;
  paths: string[];
  recursive: boolean;
}) {
  if (!model) return;
  const ops = paths
    .filter((path) => path && model.getItem(path))
    .map((path) => ({
      type: 'remove' as const,
      path,
      recursive,
    }));
  if (ops.length === 0) return;
  model.batch(ops);
}

function handleRename({
  model,
  renames,
}: {
  model: PierreFileTree | null;
  renames: Array<{ oldPath: string; newPath: string }>;
}) {
  if (!model) return;
  const ops: FileTreeBatchOperation[] = [];
  for (const { oldPath, newPath } of renames) {
    if (!oldPath || !newPath) continue;
    if (!model.getItem(oldPath)) continue;
    if (model.getItem(newPath)) continue;
    ops.push({ type: 'move', from: oldPath, to: newPath });
  }
  if (ops.length === 0) return;
  model.batch(ops);
}
