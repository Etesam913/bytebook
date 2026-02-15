import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { logger } from '../utils/logging';
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react';
import { Window } from '@wailsio/runtime';
import { type LexicalEditor } from 'lexical';
import { type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { navigate } from 'wouter/use-browser-location';
import {
  DoesNoteExist,
  MoveToTrash,
  RenameFile,
  RevealFolderOrFileInFinder,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { projectSettingsAtom, sidebarSelectionAtom } from '../atoms';
import { CUSTOM_TRANSFORMERS } from '../components/editor/transformers';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { QueryError } from '../utils/query';
import { getFilePathFromNoteSelectionRange } from '../utils/selection';
import { getContentTypeAndValueFromSelectionRangeValue } from '../utils/string-formatting';
import { FilePath, LocalFilePath, createFilePath } from '../utils/path';
import { useWailsEvent } from './events';
import { useUpdateProjectSettingsMutation } from './project-settings';
import type { Frontmatter } from '../types';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { parseFrontMatter } from '../components/editor/utils/note-metadata';
import {
  addFileToFileTreeMap,
  removeFileFromFileTreeMap,
} from '../components/virtualized/virtualized-file-tree/utils/file-tree-utils';
import {
  applyNodeUpdates,
  applyParentFolderUpdates,
  applyPathRemappings,
  buildRenameUpdates,
} from '../components/virtualized/virtualized-file-tree/utils/rename-item';
import { fileTreeDataAtom } from '../components/virtualized/virtualized-file-tree';
import { useFilePathFromRoute } from './routes';
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

/** This function is used to handle note:create events */
export function useNoteCreate() {
  const queryClient = useQueryClient();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);

  useWailsEvent('note:create', async (body) => {
    logger.event('note:create', body);
    const data = body.data as { notePath: string }[];
    let needsTopLevelInvalidation = false;

    setFileTreeData((prev) => {
      let updatedTreeData = new Map(prev.treeData);
      const updatedFilePathToTreeDataId = new Map(prev.filePathToTreeDataId);

      for (const { notePath } of data) {
        // Skip if note path already exists in the filepath-to-id mapping
        if (updatedFilePathToTreeDataId.has(notePath)) {
          continue;
        }

        const segments = notePath.split('/').filter(Boolean);

        if (segments.length === 1) {
          // Top-level file - just invalidate the query
          needsTopLevelInvalidation = true;
          continue;
        }

        // Nested file - add it directly to the map
        const fileName = segments[segments.length - 1];
        const parentPath = segments.slice(0, -1).join('/');
        const parentId = updatedFilePathToTreeDataId.get(parentPath);

        if (!parentId) {
          // Parent not found in path map - invalidate queries
          needsTopLevelInvalidation = true;
          continue;
        }

        const parent = updatedTreeData.get(parentId);
        if (!parent || parent.type !== 'folder' || !parent.isOpen) {
          // Parent doesn't exist or isn't open - nothing to update
          continue;
        }

        // Generate a new UUID for this file
        const newFileId = crypto.randomUUID();
        updatedFilePathToTreeDataId.set(notePath, newFileId);
        updatedTreeData = addFileToFileTreeMap({
          map: updatedTreeData,
          fileId: newFileId,
          filePath: notePath,
          fileName,
          parentId,
        });
      }

      return {
        treeData: updatedTreeData,
        filePathToTreeDataId: updatedFilePathToTreeDataId,
      };
    });

    if (needsTopLevelInvalidation) {
      queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }
  });
}

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

/** This function is used to handle note:delete events */
export function useNoteDelete() {
  const queryClient = useQueryClient();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const currentRouteFilePath = useFilePathFromRoute();

  useWailsEvent('note:delete', async (body) => {
    logger.event('note:delete', body);
    const data = body.data as { notePath: string }[];
    let needsTopLevelInvalidation = false;

    setFileTreeData((prev) => {
      let updatedTreeData = new Map(prev.treeData);
      const updatedFilePathToTreeDataId = new Map(prev.filePathToTreeDataId);

      for (const { notePath } of data) {
        const segments = notePath.split('/').filter(Boolean);

        if (segments.length === 1) {
          // Top-level file - just invalidate the query
          needsTopLevelInvalidation = true;
          continue;
        }

        // Nested file - remove it from the map
        const parentPath = segments.slice(0, -1).join('/');

        // Look up ids from paths
        const fileId = updatedFilePathToTreeDataId.get(notePath);
        const parentId = updatedFilePathToTreeDataId.get(parentPath);

        if (!fileId || !parentId) {
          // Can't find file in path map - invalidate queries
          needsTopLevelInvalidation = true;
          continue;
        }

        updatedFilePathToTreeDataId.delete(notePath);
        updatedTreeData = removeFileFromFileTreeMap({
          map: updatedTreeData,
          fileId,
          parentId,
        });
      }

      return {
        treeData: updatedTreeData,
        filePathToTreeDataId: updatedFilePathToTreeDataId,
      };
    });

    if (needsTopLevelInvalidation) {
      queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }

    const didDeleteCurrentRouteFile = currentRouteFilePath
      ? data.some(({ notePath }) => notePath === currentRouteFilePath.fullPath)
      : false;

    if (didDeleteCurrentRouteFile) {
      navigate(routeUrls.notFoundFallback());
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

export function useMoveToTrashMutationNew() {
  return useMutation({
    mutationFn: async ({ path }: { path: string }) => {
      const res = await MoveToTrash([path]);
      if (!res.success) throw new Error(res.message);
    },
    onError: (e) => {
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
      }
    },
  });
}

export function useMoveNoteToTrashMutation() {
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);
  return useMutation({
    mutationFn: async ({
      selectionRange,
      folder,
    }: {
      selectionRange: Set<string>;
      folder: string;
    }) => {
      const filePaths = getFilePathFromNoteSelectionRange(
        folder,
        selectionRange
      );
      // The deleted elements should be removed from selection
      setSidebarSelection((prev) => ({ ...prev, selections: new Set() }));
      const res = await MoveToTrash(
        filePaths.map((filePath) => filePath.toString())
      );
      if (!res.success) throw new Error(res.message);
    },
    onError: (e) => {
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
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
export function useNoteExists(filePath: LocalFilePath) {
  return useQuery({
    ...noteQueries.doesNoteExist(
      filePath.folder,
      filePath.noteWithoutExtension,
      filePath.noteExtension
    ),
    enabled: !!filePath.noteWithoutExtension,
  });
}
