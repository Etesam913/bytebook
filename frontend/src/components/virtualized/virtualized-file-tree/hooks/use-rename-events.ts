import { useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { navigate } from 'wouter/use-browser-location';
import { fileTreeDataAtom } from '../../../../atoms';
import { useWailsEvent, type WailsEvent } from '../../../../hooks/events';
import {
  useFilePathFromRoute,
  useCurrentNotesRouteFolderPath,
} from '../../../../hooks/routes';
import { FOLDER_RENAME, NOTE_RENAME } from '../../../../utils/events';
import { createFilePath, createFolderPath } from '../../../../utils/path';
import { logger } from '../../../../utils/logging';
import { routeUrls } from '../../../../utils/routes';
import {
  applyNodeUpdates,
  applyParentFolderUpdates,
  applyPathRemappings,
  buildRenameUpdates,
} from '../utils/rename-node';

/** Normalizes a raw folder path string into its canonical form via `createFolderPath`. */
function normalizeFolderPath(path: string): string | null {
  return createFolderPath(path)?.fullPath ?? null;
}

/** Returns true if `path` equals `maybePrefix` or is a descendant of it. */
function isPrefixOrSamePath(path: string, maybePrefix: string): boolean {
  return path === maybePrefix || path.startsWith(`${maybePrefix}/`);
}

/**
 * Consolidated hook that handles both `note:rename` and `folder:rename`
 * Wails events. Replaces the previous separate `useNoteRename` and
 * `useFolderRename` hooks.
 *
 * The rename pipeline has three phases:
 *
 * 1. **Tree update** (inside `setFileTreeData` for atomicity):
 *    - `buildRenameUpdates` — resolves old paths in `prev` state (pre-rename
 *      names), records path remappings, node updates, and parent folder
 *      updates with original pagination boundaries.
 *    - `applyPathRemappings` — remaps old→new in the path index (and subtree
 *      paths for folder renames).
 *    - `applyNodeUpdates` — patches each renamed node's name/path/parentId.
 *    - `applyParentFolderUpdates` — re-sorts children and enforces pagination:
 *      any node whose new name sorts past the original last loaded child is
 *      removed from the tree to avoid duplicates when the next page is fetched.
 *
 * 2. **Query invalidation** — top-level renames trigger a refetch of root items.
 *
 * 3. **Navigation** — if the current route references a renamed path, the URL
 *    is updated to match the new name. For folder renames this includes prefix
 *    matching (e.g. renaming a parent folder updates a nested note's route).
 *
 * Uses `useSetAtom` (setter only) instead of `useAtom` to avoid capturing a
 * stale snapshot in the event callback closure. All reads happen inside the
 * `setFileTreeData((prev) => ...)` updater.
 */
export function useRenameEvents() {
  const queryClient = useQueryClient();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const currentRouteFilePath = useFilePathFromRoute();
  const currentRouteFolderPath = useCurrentNotesRouteFolderPath();

  function handleRename(
    eventName: typeof NOTE_RENAME | typeof FOLDER_RENAME,
    body: WailsEvent
  ) {
    logger.event(eventName, body);
    const rawData = body.data as Array<Record<string, string>>;

    // Normalize the event payload into a common { oldPath, newPath } shape.
    // `note:rename` events use `oldNotePath`/`newNotePath` keys while
    // `folder:rename` events use `oldFolderPath`/`newFolderPath`.
    const entries = rawData.map((item) => {
      if (eventName === NOTE_RENAME) {
        const { oldNotePath, newNotePath } = item as {
          oldNotePath: string;
          newNotePath: string;
        };
        return { oldPath: oldNotePath, newPath: newNotePath };
      }
      const { oldFolderPath, newFolderPath } = item as {
        oldFolderPath: string;
        newFolderPath: string;
      };
      return { oldPath: oldFolderPath, newPath: newFolderPath };
    });

    const mode = eventName === NOTE_RENAME ? 'file' : 'folder';

    let needsTopLevelInvalidation = false;

    // --- Phase 1: atomic tree update ---
    setFileTreeData((prev) => {
      // Build rename metadata from the *current* (pre-rename) tree state.
      // This captures original names for pagination boundary checks.
      const renameUpdates = buildRenameUpdates({
        entries,
        fileTreeData: prev,
        // For folder renames, skip any node that isn't actually a folder
        isValidNode:
          mode === 'folder' ? (node) => node.type === 'folder' : undefined,
      });

      needsTopLevelInvalidation = renameUpdates.needsTopLevelInvalidation;

      if (renameUpdates.pathRemappings.size === 0) return prev;

      // Step 1: Remap old→new in the path-to-id index (+ subtree for folders)
      const remapped = applyPathRemappings({
        fileTreeData: prev,
        pathRemappings: renameUpdates.pathRemappings,
        mode,
      });

      // Step 2: Patch each renamed node's name, path, and parentId
      const updatedNodes = applyNodeUpdates({
        treeData: remapped.treeData,
        nodeUpdates: renameUpdates.nodeUpdates,
        expectedType: mode,
      });

      // Step 3: Re-sort parent children lists and enforce pagination boundaries
      const result = applyParentFolderUpdates({
        treeData: updatedNodes,
        filePathToTreeDataId: remapped.filePathToTreeDataId,
        parentFolderUpdates: renameUpdates.parentFolderUpdates,
      });

      return result;
    });

    // --- Phase 2: query invalidation ---
    if (needsTopLevelInvalidation) {
      void queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }

    // --- Phase 3: navigation ---

    // For note renames: if the user is viewing the renamed note, redirect to
    // the new URL so the editor stays on the correct file.
    if (eventName === NOTE_RENAME && currentRouteFilePath) {
      const matchedRename = entries.find(
        ({ oldPath }) => oldPath === currentRouteFilePath.fullPath
      );
      if (matchedRename) {
        const newFilePath = createFilePath(matchedRename.newPath);
        navigate(
          newFilePath
            ? newFilePath.encodedFileUrl
            : routeUrls.notFoundFallback()
        );
      }
    }

    // For folder renames: if the user is viewing a note/folder whose route
    // starts with the renamed folder path, reconstruct the URL with the new
    // folder name while preserving the suffix.
    // Example: viewing "/notes/old-folder/sub/NoteA", "old-folder" → "new-folder"
    //          navigates to "/notes/new-folder/sub/NoteA"
    if (eventName === FOLDER_RENAME && currentRouteFolderPath) {
      const matchedRename = entries.find(({ oldPath }) => {
        const normalizedOld = normalizeFolderPath(oldPath);
        if (!normalizedOld) return false;
        return isPrefixOrSamePath(
          currentRouteFolderPath.fullPath,
          normalizedOld
        );
      });

      if (matchedRename) {
        const normalizedOldFolderPath = normalizeFolderPath(
          matchedRename.oldPath
        );
        const normalizedNewFolderPath = normalizeFolderPath(
          matchedRename.newPath
        );
        if (!normalizedOldFolderPath || !normalizedNewFolderPath) {
          navigate(routeUrls.notFoundFallback());
          return;
        }

        // Preserve the route suffix after the renamed folder segment
        const suffix = currentRouteFolderPath.fullPath.slice(
          normalizedOldFolderPath.length
        );
        const nextFolderPath = `${normalizedNewFolderPath}${suffix}`;

        // If viewing a note inside the renamed folder, navigate to the note URL
        if (currentRouteFilePath) {
          const newFilePath = createFilePath(
            `${nextFolderPath}/${currentRouteFilePath.note}`
          );
          navigate(
            newFilePath
              ? newFilePath.encodedFileUrl
              : routeUrls.notFoundFallback()
          );
          return;
        }

        // Otherwise navigate to the folder URL
        const newFolderPath = createFolderPath(nextFolderPath);
        navigate(
          newFolderPath
            ? newFolderPath.encodedFolderUrl
            : routeUrls.notFoundFallback()
        );
      }
    }
  }

  useWailsEvent(NOTE_RENAME, (body) => handleRename(NOTE_RENAME, body));
  useWailsEvent(FOLDER_RENAME, (body) => handleRename(FOLDER_RENAME, body));
}
