import { useProjectSettingsQuery } from '@hooks/project-settings';
import { type Dispatch, type SetStateAction } from 'react';
import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { useStore } from 'jotai/react';
import { type LexicalEditor } from 'lexical';
import { toast } from 'sonner';
import { navigate } from 'wouter/use-browser-location';
import {
  DoesNoteExist,
  OpenInNewWindow,
  MoveToTrash,
  RenameFile,
  RestoreFromTrash,
  RevealFolderOrFileInFinder,
} from '@bindings/services/noteservice';
import { previousMarkdownAtom } from '@components/editor/atoms';
import { CUSTOM_TRANSFORMERS } from '@components/editor/transformers';
import { DEFAULT_SONNER_OPTIONS } from '@utils/general';
import { getBackendResponseData } from '@utils/query';
import { queryKeys } from '@utils/query-keys';
import {
  getNavigationTargetForDeletedPaths,
  navigateToPath,
} from '@utils/routes';
import {
  createFilePath,
  stripTrailingSlash,
  type FileOrFolderPath,
  type FilePath,
} from '@utils/path';
import { useWailsEvent } from './events';
import { CODE_RESULTS_UPDATE, FILE_WRITE } from '@bindings/util/event-names';
import { useUpdateProjectSettingsMutation } from './project-settings';
import type { Frontmatter, TrashRestoreInfo } from '@/types';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { parseFrontMatter } from '@components/editor/utils/note-metadata';
import { useRecentItemFromRoute } from './routes';
import { applyCodeResultsSidecar } from '@components/editor/utils/code-results';

const noteQueries = {
  doesNoteExist: (filePath: FilePath | null) =>
    queryOptions({
      queryKey: queryKeys.doesNoteExist(filePath?.fullPath ?? ''),
      queryFn: () => {
        if (!filePath) return false;
        return DoesNoteExist(filePath.fullPath);
      },
    }),
};

export function useOpenInNewWindowMutation() {
  return useMutation({
    mutationFn: async ({ path }: { path: FileOrFolderPath }) => {
      await getBackendResponseData(
        OpenInNewWindow(stripTrailingSlash(path.fullPath))
      );
    },
  });
}

/**
 * Reveals a single file or folder inside the project's `notes/` directory in
 * the system file manager. Accepts a typed `FilePath`/`FolderPath` so callers
 * cannot accidentally point at arbitrary disk paths.
 */
export function useRevealInFinderMutation() {
  return useMutation({
    mutationFn: async ({ path }: { path: FileOrFolderPath }) => {
      await getBackendResponseData(
        RevealFolderOrFileInFinder(
          `notes/${stripTrailingSlash(path.fullPath)}`,
          true
        )
      );
    },
  });
}

/**
 * Moves one or more note/file-tree paths to trash.
 * Accepts project-relative paths (for example, `folder/note.md` or `folder`).
 * The `file:delete` / `folder:delete` watcher events that follow remove the
 * paths from the sidebar tree model. Navigates away immediately if the
 * current route is among the deleted paths.
 */
export function useMoveToTrashMutation() {
  const { mutate: restoreFromTrash } = useRestoreFromTrashMutation();
  /** The currently-viewed path (file or folder), if any. */
  const currentRoute = useRecentItemFromRoute();
  const currentRoutePath = currentRoute?.fullPath ?? null;

  function showTrashUndo(
    restoreItems: TrashRestoreInfo[],
    returnTo: FileOrFolderPath | null
  ) {
    if (restoreItems.length === 0) return;

    const label =
      restoreItems.length === 1
        ? `Moved ${restoreItems[0].originalPath.split('/').slice(-1)[0]} to Trash`
        : `Moved ${restoreItems.length} items to Trash`;

    toast.message(label, {
      ...DEFAULT_SONNER_OPTIONS,
      action: {
        label: 'Undo',
        onClick: () => {
          restoreFromTrash({ restoreItems, returnTo });
        },
      },
    });
  }

  return useMutation({
    mutationFn: async ({ paths }: { paths: string[] }) => {
      // Navigate immediately if the current route was among the deleted paths
      const navigationTarget = getNavigationTargetForDeletedPaths({
        currentRoutePath,
        paths,
      });
      if (navigationTarget) {
        navigate(navigationTarget);
      }

      const response = await MoveToTrash(paths.map(stripTrailingSlash));
      // Failed batches can still contain successful moves that need Undo.
      const restoreItems = response.data ?? [];
      const restoredPaths = paths.filter((path) =>
        restoreItems.some((item) =>
          item.originalPath.endsWith(`/${stripTrailingSlash(path)}`)
        )
      );
      const returnTo = getNavigationTargetForDeletedPaths({
        currentRoutePath,
        paths: restoredPaths,
      })
        ? currentRoute
        : null;
      showTrashUndo(restoreItems, returnTo);
      return (await getBackendResponseData(response)) ?? [];
    },
  });
}

function useRestoreFromTrashMutation() {
  return useMutation({
    mutationFn: async ({
      restoreItems,
    }: {
      restoreItems: TrashRestoreInfo[];
      returnTo: FileOrFolderPath | null;
    }) => {
      await getBackendResponseData(RestoreFromTrash(restoreItems));
    },
    onSuccess: (_data, { returnTo }) => {
      if (returnTo) navigateToPath(returnTo);
    },
  });
}

/**
 * A simpler pin mutation that works directly with full paths.
 * This supports nested paths like `folder/subfolder/note.md` and folders.
 */
export function usePinPathMutation() {
  const { mutateAsync: updateProjectSettings } =
    useUpdateProjectSettingsMutation();
  const projectSettings = useProjectSettingsQuery().data;

  return useMutation({
    mutationFn: async ({
      paths,
      shouldPin,
    }: {
      paths: string[];
      shouldPin: boolean;
    }) => {
      const newProjectSettings = {
        ...projectSettings,
        pinnedNotes: new Set(projectSettings.pinnedNotes),
      };
      // Apply the whole selection in one write. Calling this once per path
      // would rebuild every payload from the same stale atom snapshot, so only
      // the last write would survive.
      for (const path of paths) {
        // pinnedNotes persists to settings.json in slashless form.
        const normalizedPath = stripTrailingSlash(path);
        if (shouldPin) {
          newProjectSettings.pinnedNotes.add(normalizedPath);
        } else {
          newProjectSettings.pinnedNotes.delete(normalizedPath);
        }
      }
      return updateProjectSettings({ newProjectSettings });
    },
  });
}

// Renames a note file on disk; the caller displays errors inline.
export function useRenameFileMutation() {
  return useMutation({
    meta: { inlineError: true },
    mutationFn: async ({
      oldPath,
      newPath,
    }: {
      oldPath: FilePath;
      newPath: FilePath;
    }) => {
      return getBackendResponseData(
        RenameFile(oldPath.fullPath, newPath.fullPath)
      );
    },
  });
}

/**
 * Hook to handle the "file:write" event from the file watcher.
 * Updates the note content in the editor when the note is changed from another window or from the file system.
 *
 * @param filePath - The note currently open in the editor.
 * @param editor - The LexicalEditor instance to update the editor state.
 * @param setFrontmatter - A function to update the frontmatter state.
 */
export function useNoteWriteEvent({
  filePath,
  editor,
  setFrontmatter,
}: {
  filePath: FilePath;
  editor: LexicalEditor;
  setFrontmatter: Dispatch<SetStateAction<Frontmatter>>;
}) {
  const store = useStore();

  useWailsEvent(FILE_WRITE, (event) => {
    for (const { filePath: eventPath, markdown } of event.data) {
      const path = createFilePath(eventPath);
      if (
        !path ||
        path.fullPath !== filePath.fullPath ||
        path.extension !== 'md' ||
        typeof markdown !== 'string'
      ) {
        continue;
      }

      // Skip save echoes without resetting selection or newer unsaved typing.
      if (markdown === store.get(previousMarkdownAtom)) continue;
      const { content, frontMatter } = parseFrontMatter(markdown);
      editor.update(
        () => {
          $convertFromMarkdownString(
            content,
            CUSTOM_TRANSFORMERS,
            undefined,
            true,
            false
          );
        },
        { tag: 'note:write-from-external' }
      );
      // Future saves must use the external metadata as their baseline too.
      store.set(previousMarkdownAtom, markdown);
      setFrontmatter(frontMatter);
    }
  });

  useWailsEvent(CODE_RESULTS_UPDATE, (e) => {
    const data = e.data;
    const eventPath = createFilePath(data.filePath);

    if (!eventPath || eventPath.fullPath !== filePath.fullPath) {
      return;
    }

    editor.update(
      () => {
        applyCodeResultsSidecar(data.codeResults);
      },
      { tag: 'note:write-from-external' }
    );
  });
}

/**
 * Checks whether a note exists on disk.
 * @param filePath - The note path, or null when no note is selected
 * @returns Query result indicating if the note exists
 */
export function useNoteExists(filePath: FilePath | null) {
  return useQuery({
    ...noteQueries.doesNoteExist(filePath),
    enabled: filePath !== null,
  });
}
