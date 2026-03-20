import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { logger } from '../utils/logging';
import { useAtom, useAtomValue } from 'jotai/react';
import { Window } from '@wailsio/runtime';
import { type LexicalEditor } from 'lexical';
import { type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { navigate } from 'wouter/use-browser-location';
import {
  DoesNoteExist,
  MoveToTrash,
  RenameFile,
  RestoreFromTrash,
  RevealFolderOrFileInFinder,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { projectSettingsAtom, type TrashRestoreInfo } from '../atoms';
import { CUSTOM_TRANSFORMERS } from '../components/editor/transformers';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { QueryError } from '../utils/query';
import { getContentTypeAndValueFromSelectionRangeValue } from '../utils/string-formatting';
import {
  FilePath,
  LocalFilePath,
  createFilePath,
  createFolderPath,
} from '../utils/path';
import { useWailsEvent } from './events';
import { useUpdateProjectSettingsMutation } from './project-settings';
import type { Frontmatter } from '../types';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { parseFrontMatter } from '../components/editor/utils/note-metadata';
import {
  getNavigationTargetForDeletedPaths,
  removePathsFromFileTree,
} from '../components/virtualized/virtualized-file-tree/utils/file-tree-utils';
import {
  applyNodeUpdates,
  applyParentFolderUpdates,
  applyPathRemappings,
  buildRenameUpdates,
} from '../components/virtualized/virtualized-file-tree/utils/rename-item';
import { fileTreeDataAtom } from '../atoms';
import { useFilePathFromRoute, useFolderPathFromRoute } from './routes';
import { routeUrls } from '../utils/routes';

const noteQueries = {
  doesNoteExist: (folder: string, note: string, extension: string) =>
    queryOptions({
      queryKey: ['doesNoteExist', folder, note, extension],
      queryFn: () => {
        if (!note) return false;
        return DoesNoteExist(
          `${folder}/${decodeURIComponent(note)}.${extension}`
        );
      },
    }),
};

export function useNoteRename() {
  const queryClient = useQueryClient();
  const [{ filePathToTreeDataId, treeData }, setFileTreeData] =
    useAtom(fileTreeDataAtom);
  const currentRouteFilePath = useFilePathFromRoute();

  useWailsEvent('note:rename', async (body) => {
    logger.event('note:rename', body);
    const data = body.data as {
      oldNotePath: string;
      newNotePath: string;
    }[];
    const {
      needsTopLevelInvalidation,
      pathRemappings,
      nodeUpdates,
      parentFolderUpdates,
    } = await buildRenameUpdates({
      entries: data.map(({ oldNotePath, newNotePath }) => ({
        oldPath: oldNotePath,
        newPath: newNotePath,
      })),
      fileTreeData: { filePathToTreeDataId, treeData },
      onMissingNode: (oldPath) => {
        logger.error('note:rename', 'id for old note path not found', {
          oldNotePath: oldPath,
        });
      },
    });

    if (needsTopLevelInvalidation) {
      queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }

    // Apply all changes in a single setFileTreeData call
    if (pathRemappings.size > 0) {
      setFileTreeData((prev) => {
        const remappedTreeData = applyPathRemappings({
          fileTreeData: prev,
          pathRemappings,
          mode: 'file',
        });
        let updatedTreeData = applyNodeUpdates({
          treeData: remappedTreeData.treeData,
          nodeUpdates,
          expectedType: 'file',
        });
        updatedTreeData = applyParentFolderUpdates({
          treeData: updatedTreeData,
          parentFolderUpdates,
        });

        return {
          treeData: updatedTreeData,
          filePathToTreeDataId: remappedTreeData.filePathToTreeDataId,
        };
      });
    }

    const matchedRename = currentRouteFilePath
      ? data.find(
          ({ oldNotePath }) => oldNotePath === currentRouteFilePath.fullPath
        )
      : undefined;

    // If the current note is being renamed, redirect to the new note path
    if (matchedRename) {
      const newRouteFilePath = createFilePath(matchedRename.newNotePath);
      if (!newRouteFilePath) {
        navigate(routeUrls.notFoundFallback());
        return;
      }
      navigate(newRouteFilePath.encodedFileUrl);
    }
  });
}

/** Custom hook to handle revealing folders in Finder */
export function useNoteRevealInFinderMutation() {
  return useMutation({
    // The main function that handles revealing folders in Finder
    mutationFn: async ({
      selectionRange,
      folder,
    }: {
      selectionRange: Set<string>;
      folder: string;
    }) => {
      // Limit the number of folders to reveal to 5
      const selectedNotes = [...selectionRange].slice(0, 5);
      // Reveal each selected folder in Finder
      const res = await Promise.all(
        selectedNotes.map(async (selectionRangeValue) => {
          const { value: note } =
            getContentTypeAndValueFromSelectionRangeValue(selectionRangeValue);
          return await RevealFolderOrFileInFinder(
            `notes/${folder}/${note}`,
            true
          );
        })
      );
      const failedNotes: string[] = [];

      res.forEach((r, i) => {
        if (!r.success) {
          const { value: note } = getContentTypeAndValueFromSelectionRangeValue(
            selectedNotes[i]
          );
          failedNotes.push(note);
        }
      });

      if (failedNotes.length > 0) {
        throw new QueryError(
          `Failed to reveal ${failedNotes.join(', ')} in finder`
        );
      }
    },
  });
}

/**
 * Moves one or more note/file-tree paths to trash.
 * Accepts project-relative paths (for example, `folder/note.md` or `folder`).
 * Optimistically removes items from the file tree and navigates away if the
 * current route is among the deleted paths.
 */
export function useMoveToTrashMutation() {
  const { mutate: restoreFromTrash } = useRestoreFromTrashMutation();
  const [fileTreeData, setFileTreeData] = useAtom(fileTreeDataAtom);
  const queryClient = useQueryClient();
  const currentRouteFilePath = useFilePathFromRoute();
  const currentRouteFolderPath = useFolderPathFromRoute();

  /** The currently-viewed path (file or folder), if any. */
  const currentRoutePath =
    currentRouteFilePath?.fullPath ?? currentRouteFolderPath?.fullPath ?? null;

  return useMutation({
    mutationFn: async ({ paths }: { paths: string[] }) => {
      const res = await MoveToTrash(paths);
      if (!res.success) throw new Error(res.message);
      return res.data ?? [];
    },
    onMutate: ({ paths }) => {
      const previousFileTreeData = fileTreeData;

      let needsTopLevelInvalidation = false;
      setFileTreeData((prev) => {
        const result = removePathsFromFileTree(prev, paths);
        needsTopLevelInvalidation = result.needsTopLevelInvalidation;
        if (!result.didChange) return prev;
        return result.next;
      });

      if (needsTopLevelInvalidation) {
        void queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
      }

      // Navigate immediately if the current route was among the deleted paths
      const navigationTarget = getNavigationTargetForDeletedPaths({
        currentRoutePath,
        fileTreeData: previousFileTreeData,
        paths,
      });
      if (navigationTarget) {
        navigate(navigationTarget);
      }

      return { previousFileTreeData };
    },
    onError: (e, _variables, context) => {
      // Roll back optimistic update
      if (context?.previousFileTreeData) {
        setFileTreeData(context.previousFileTreeData);
      }
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
      }
    },
    onSuccess: (restoreItems) => {
      if (restoreItems.length === 0) {
        return;
      }

      const label =
        restoreItems.length === 1
          ? `Moved ${restoreItems[0].originalPath.split('/').slice(-1)[0]} to Trash`
          : `Moved ${restoreItems.length} items to Trash`;

      toast.message(label, {
        ...DEFAULT_SONNER_OPTIONS,
        action: {
          label: 'Undo',
          onClick: () => {
            restoreFromTrash({ restoreItems });
          },
        },
      });
    },
  });
}

function useRestoreFromTrashMutation() {
  return useMutation({
    mutationFn: async ({
      restoreItems,
    }: {
      restoreItems: TrashRestoreInfo[];
    }) => {
      const res = await RestoreFromTrash(restoreItems);
      if (!res.success) {
        throw new Error(res.message);
      }
    },
  });
}

/**
 * A simpler pin mutation that works directly with full paths.
 * This supports nested paths like `folder/subfolder/note.md` and folders.
 */
export function usePinPathMutation() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);

  return useMutation({
    mutationFn: async ({
      path,
      shouldPin,
    }: {
      path: string;
      shouldPin: boolean;
    }) => {
      const newProjectSettings = { ...projectSettings };
      if (shouldPin) {
        newProjectSettings.pinnedNotes.add(path);
      } else {
        newProjectSettings.pinnedNotes.delete(path);
      }
      updateProjectSettings({ newProjectSettings });
    },
    onError: (e) => {
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
      }
    },
  });
}

export function useRenameFileMutation() {
  return useMutation({
    mutationFn: async ({
      oldPath,
      newPath,
    }: {
      oldPath: FilePath;
      newPath: FilePath;
      setErrorText: Dispatch<SetStateAction<string>>;
    }) => {
      const res = await RenameFile(oldPath.fullPath, newPath.fullPath);
      if (!res.success) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onError: (error, variables) => {
      if (error instanceof Error) {
        variables.setErrorText(error.message);
      } else {
        variables.setErrorText(
          'An unknown error occurred. Please try again later.'
        );
      }
    },
  });
}

/**
 * Hook to handle the "note:write" event from the file watcher.
 * Updates the note content in the editor when the note is changed from another window or from the file system.
 *
 * @param folder - The current folder name.
 * @param note - The current note name (without extension).
 * @param editor - The LexicalEditor instance to update the editor state.
 * @param setFrontmatter - A function to update the frontmatter state.
 */
export function useNoteWriteEvent({
  folder,
  note,
  editor,
  setFrontmatter,
}: {
  folder: string;
  note: string;
  editor: LexicalEditor;
  setFrontmatter: Dispatch<SetStateAction<Frontmatter>>;
}) {
  useWailsEvent('note:write', async (e) => {
    const data = e.data as {
      folder: string;
      note: string;
      markdown?: string;
    }[];

    const isWindowFocused = await Window.IsFocused();

    // Focused windows get their updates by the user typing, so we don't need to update the editor
    if (isWindowFocused) return;

    for (const item of data) {
      const { folder: folderFromEvent, note: noteFromEvent, markdown } = item;

      // Remove .md extension for comparison
      const noteWithoutExtension = noteFromEvent.replace(/\.md$/, '');

      if (!markdown) return;
      const { content, frontMatter } = parseFrontMatter(markdown);

      // Only update the editor if the current note is the one that was changed
      if (folderFromEvent === folder && noteWithoutExtension === note) {
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
        setFrontmatter(frontMatter);
      }
    }
  });
}

/**
 * Custom hook to check if a note exists in a given folder
 * @param folder - The folder path to check
 * @param note - The note name to check
 * @param fileExtension - The file extension of the note
 * @returns Query result indicating if the note exists
 */
export function useNoteExists(filePath: FilePath | LocalFilePath) {
  const extension =
    'extension' in filePath ? filePath.extension : filePath.noteExtension;
  return useQuery({
    ...noteQueries.doesNoteExist(
      filePath.folder,
      filePath.noteWithoutExtension,
      extension
    ),
    enabled: !!filePath.noteWithoutExtension,
  });
}
