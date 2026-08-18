import type { FileTree as PierreFileTree } from '@pierre/trees';
import { useWailsEvent, type WailsEvent } from '../../../../hooks/events';
import {
  FILE_CREATE,
  FILE_DELETE,
  FILE_RENAME,
  FOLDER_CREATE,
  FOLDER_DELETE,
  FOLDER_RENAME,
} from '../../../../utils/events';
import { revealTreePath } from '../model-utils';
import { usePierreRouteTargetPath } from './use-route-target-path';

type CreatePayload = { filePath?: string; folderPath?: string };
type DeletePayload = { filePath?: string; folderPath?: string };
type RenamePayload = {
  oldFilePath?: string;
  newFilePath?: string;
  oldFolderPath?: string;
  newFolderPath?: string;
};

/**
 * The frontend (and @pierre/trees) mark directories with a trailing slash,
 * but the Go file-watcher payloads always send slashless paths — this is the
 * Go → frontend boundary where the folder marker is restored.
 */
function toPierrePath(rawPath: string, isFolder: boolean): string {
  if (!rawPath) return rawPath;
  if (!isFolder) return rawPath;
  return rawPath.endsWith('/') ? rawPath : `${rawPath}/`;
}

function extractCreatePath(item: CreatePayload, isFolder: boolean): string {
  const raw = (isFolder ? item.folderPath : item.filePath) ?? '';
  return toPierrePath(raw, isFolder);
}

function extractDeletePath(item: DeletePayload, isFolder: boolean): string {
  const raw = (isFolder ? item.folderPath : item.filePath) ?? '';
  return toPierrePath(raw, isFolder);
}

function extractRename(
  item: RenamePayload,
  isFolder: boolean
): { oldPath: string; newPath: string } {
  if (isFolder) {
    return {
      oldPath: toPierrePath(item.oldFolderPath ?? '', true),
      newPath: toPierrePath(item.newFolderPath ?? '', true),
    };
  }
  return {
    oldPath: item.oldFilePath ?? '',
    newPath: item.newFilePath ?? '',
  };
}

/**
 * Pipes the Wails file-watcher events into the @pierre/trees model so the
 * visible tree stays in sync with disk state. Each event is translated into
 * a batched mutation (add / remove / move). Skips entries whose source path
 * doesn't exist in the model — the backend can emit redundant events after
 * an optimistic rename, and `model.move` throws when the source is gone.
 */
export function usePierreTreeEvents(model: PierreFileTree | null) {
  const routeTargetPath = usePierreRouteTargetPath();

  useWailsEvent(FOLDER_CREATE, (body) =>
    handleCreate({ model, body, isFolder: true, routeTargetPath })
  );
  useWailsEvent(FILE_CREATE, (body) =>
    handleCreate({ model, body, isFolder: false, routeTargetPath })
  );
  useWailsEvent(FOLDER_DELETE, (body) =>
    handleDelete({ model, body, isFolder: true })
  );
  useWailsEvent(FILE_DELETE, (body) =>
    handleDelete({ model, body, isFolder: false })
  );
  useWailsEvent(FOLDER_RENAME, (body) =>
    handleRename({ model, body, isFolder: true })
  );
  useWailsEvent(FILE_RENAME, (body) =>
    handleRename({ model, body, isFolder: false })
  );
}

function handleCreate({
  model,
  body,
  isFolder,
  routeTargetPath,
}: {
  model: PierreFileTree | null;
  body: WailsEvent;
  isFolder: boolean;
  routeTargetPath: string | null;
}) {
  if (!model) return;
  const items = (body.data as CreatePayload[]) ?? [];
  const ops = items
    .map((item) => extractCreatePath(item, isFolder))
    .filter((path) => path && !model.getItem(path))
    .map((path) => ({ type: 'add' as const, path }));
  if (ops.length === 0) return;
  model.batch(ops);
  // Creating an item navigates to it before this watcher event has inserted
  // its path, so the route-focus effect could not highlight it — catch up now
  // that the row exists.
  if (routeTargetPath && ops.some((op) => op.path === routeTargetPath)) {
    revealTreePath(model, routeTargetPath);
  }
}

function handleDelete({
  model,
  body,
  isFolder,
}: {
  model: PierreFileTree | null;
  body: WailsEvent;
  isFolder: boolean;
}) {
  if (!model) return;
  const items = (body.data as DeletePayload[]) ?? [];
  const ops = items
    .map((item) => extractDeletePath(item, isFolder))
    .filter((path) => path && model.getItem(path))
    .map((path) => ({
      type: 'remove' as const,
      path,
      recursive: isFolder,
    }));
  if (ops.length === 0) return;
  model.batch(ops);
}

function handleRename({
  model,
  body,
  isFolder,
}: {
  model: PierreFileTree | null;
  body: WailsEvent;
  isFolder: boolean;
}) {
  if (!model) return;
  const items = (body.data as RenamePayload[]) ?? [];
  const ops: Parameters<PierreFileTree['batch']>[0][number][] = [];
  for (const item of items) {
    const { oldPath, newPath } = extractRename(item, isFolder);
    if (!oldPath || !newPath) continue;
    if (!model.getItem(oldPath)) continue;
    if (model.getItem(newPath)) continue;
    ops.push({ type: 'move', from: oldPath, to: newPath });
  }
  if (ops.length === 0) return;
  model.batch(ops);
}
