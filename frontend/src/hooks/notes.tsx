import {
  InfiniteData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai/react';
import { Window } from '@wailsio/runtime';
import { type LexicalEditor } from 'lexical';
import {
  useEffect,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react';
import { toast } from 'sonner';
import { navigate } from 'wouter/use-browser-location';
import {
  AddNoteToFolder,
  DoesNoteExist,
  GetNotePreview,
  GetNotesInPage,
  GetPageForNote,
  MoveToTrash,
  RenameFile,
  RevealFolderOrFileInFinder,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import {
  noteSortAtom,
  projectSettingsAtom,
  selectionRangeAtom,
} from '../atoms';
import { CUSTOM_TRANSFORMERS } from '../components/editor/transformers';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { QueryError } from '../utils/query';
import { getFilePathFromNoteSelectionRange } from '../utils/selection';
import {
  getContentTypeAndValueFromSelectionRangeValue,
  validateName,
} from '../utils/string-formatting';
import { LocalFilePath } from '../utils/path';
import { useWailsEvent } from './events';
import { useUpdateProjectSettingsMutation } from './project-settings';
import type { Frontmatter } from '../types';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { useCreateNoteDialog } from './dialogs';
import { isEventInCurrentWindow } from '../utils/events';
import { parseFrontMatter } from '../components/editor/utils/note-metadata';

/** Data for a single page of notes */
export type NotesPageData = {
  notes: LocalFilePath[];
  totalCount: number;
  initialItemIndex: number;
  pageIndex: number;
};

/** Combined data from all pages for infinite query */
export type NotesInfiniteData = InfiniteData<NotesPageData>;

type NoteFormElementWithMetadata = HTMLFormElement & {
  __noteName?: string;
  __folder?: string;
};

const noteQueries = {
  getNotePreview: (folder: string, noteWithoutExtension: string) =>
    queryOptions({
      queryKey: ['note-preview', folder, noteWithoutExtension],
      queryFn: () =>
        GetNotePreview(`notes/${folder}/${noteWithoutExtension}.md`),
    }),
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
  getPageForNote: ({
    folder,
    noteSort,
    note,
  }: {
    folder: string;
    noteSort: string;
    note: string | undefined;
  }) =>
    queryOptions({
      queryKey: ['notePageIndex', folder, noteSort, note],
      queryFn: async () => {
        if (!note) return 0;
        const res = await GetPageForNote(
          decodeURIComponent(folder),
          noteSort,
          note
        );
        console.info({
          queryKey: ['notePageIndex', folder, noteSort, note],
          res,
        });
        return res.success ? res.data : 0;
      },
    }),
};

/** Hook to get the page index for a specific note */
export function useNotePageIndex(folder: string, note: string | undefined) {
  const noteSort = useAtomValue(noteSortAtom);

  return useQuery({
    ...noteQueries.getPageForNote({ folder, noteSort, note }),
  });
}

/**
 * Once the page index for a note is determined, then the notes in that page have to be displayed.
 * useInfiniteQuery is used to enable fetching previous and next pages easily.
 *
 * totalCount & initialItemIndex are used to let the virtualized-list know where the current
 * item is in the grand-scheme of the list.
 */
export function useNotesInPage(
  curFolder: string,
  anchorPageIndex: number,
  anchorPageLoading: boolean
) {
  const noteSort = useAtomValue(noteSortAtom);
  const queryClient = useQueryClient();
  const queryKey = ['notes', curFolder, noteSort];

  const query = useInfiniteQuery({
    // When getting the anchor page is done loading, this query is automatically re-ran
    enabled: !anchorPageLoading,
    queryKey,
    // When a user clicks a search result, the anchorPageIndex will be the page index of
    // the note associated with the search result. If a user clicks a folder the
    // anchorPageIndex will just be 0
    initialPageParam: anchorPageIndex,
    queryFn: async ({ pageParam }) => {
      const res = await GetNotesInPage(
        decodeURIComponent(curFolder),
        noteSort,
        pageParam
      );

      console.info({
        queryKey,
        res,
      });

      if (!res.success || !res.data) {
        throw new QueryError('Failed in retrieving notes');
      }
      return {
        notes: (res.data.notes ?? []).map(
          (item) => new LocalFilePath({ folder: item.folder, note: item.note })
        ),
        totalCount: res.data.totalCount,
        initialItemIndex: res.data.initialItemIndex,
        pageIndex: pageParam,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((acc, p) => acc + p.notes.length, 0);
      if (loadedCount >= lastPage.totalCount) return undefined;

      const maxPageIndex = Math.max(...allPages.map((p) => p.pageIndex));
      return maxPageIndex + 1;
    },
    getPreviousPageParam: (_, allPages) => {
      const minPageIndex = Math.min(...allPages.map((p) => p.pageIndex));
      return minPageIndex > 0 ? minPageIndex - 1 : undefined;
    },
  });

  // When a user clicks a link in a note a navigate will occur. This will update the
  // curNote in the route. This will trigger the getPageForNote query to return the
  // page index for the note. Once that query is done loading the useNotesInPage
  // query will be enabled and will run. The problem is that the initialPageParam
  // is out of date and therefore the query won't have the correct data.
  //
  // The solution for this is to reset the query so that it automatically uses
  // the appropriate pageParam
  useEffect(() => {
    if (anchorPageLoading || query.isLoading || !query.data) {
      return;
    }

    // Check if the requested anchor page actually exists in the current cache data
    const pageExists = query.data.pages.some(
      (page) => page.pageIndex === anchorPageIndex
    );

    // If the cache exists but misses our target page, we declare "bankruptcy" on this cache.
    // Resetting it clears the data and forces `useInfiniteQuery` to restart
    // using the `initialPageParam` (which is our desired anchorPageIndex).
    if (!pageExists) {
      queryClient.resetQueries({ queryKey });
    }
  }, [
    anchorPageIndex,
    anchorPageLoading,
    query.data,
    query.isLoading,
    queryKey,
    queryClient,
  ]);

  return query;
}

/** This function is used to handle note:create events */
export function useNoteCreate() {
  const noteSort = useAtomValue(noteSortAtom);
  const queryClient = useQueryClient();

  useWailsEvent('note:create', async (body) => {
    console.info('note:create', body);
    const data = body.data as { folder: string; note: string }[];

    // Group created notes by folder
    const notesByFolder = new Map<string, LocalFilePath[]>();
    for (const item of data) {
      const { folder, note } = item;
      const notePath = new LocalFilePath({ folder, note });
      const existing = notesByFolder.get(folder) ?? [];
      notesByFolder.set(folder, [...existing, notePath]);
    }

    // Update the cache once per folder
    for (const [folder, notePaths] of notesByFolder) {
      const queryKey = ['notes', folder, noteSort];

      queryClient.setQueryData<NotesInfiniteData>(queryKey, (oldData) => {
        if (!oldData) return oldData;

        // Filter out notes that already exist in the cache
        const newNotesToAdd = notePaths.filter((newNotePath) => {
          const doesNoteAlreadyExist = oldData.pages.some((page) =>
            page.notes.some((localFilePath) =>
              localFilePath.equals(newNotePath)
            )
          );
          return !doesNoteAlreadyExist;
        });

        if (newNotesToAdd.length === 0) return oldData;

        // Create new pages with the new notes prepended to the first page
        const newPages = oldData.pages.map((page, index) => {
          if (index === 0) {
            return {
              ...page,
              notes: [...newNotesToAdd, ...page.notes],
              totalCount: page.totalCount + newNotesToAdd.length,
            };
          }
          return {
            ...page,
            totalCount: page.totalCount + newNotesToAdd.length,
          };
        });
        return { ...oldData, pages: newPages };
      });
    }
  });
}

/**
 * Custom hook to handle note creation through a dialog form submission.
 * Optimistically updates the cache so that navigation can happen without
 * a 404 page error
 */
export function useNoteCreateMutation() {
  const queryClient = useQueryClient();
  const noteSort = useAtomValue(noteSortAtom);

  return useMutation({
    mutationFn: async ({
      e,
      folder,
    }: {
      e: FormEvent<HTMLFormElement>;
      folder: string;
      setErrorText: Dispatch<SetStateAction<string>>;
    }): Promise<boolean> => {
      // Extract form data and validate the note name
      const formElement = e.target as NoteFormElementWithMetadata;
      const formData = new FormData(formElement);
      const newNoteName = formData.get('note-name');
      const { isValid, errorMessage } = validateName(newNoteName, 'note');
      if (!isValid) throw new Error(errorMessage);
      if (!newNoteName) return false;

      const newNoteNameString = newNoteName.toString().trim();

      // Handle note creation
      const res = await AddNoteToFolder(folder, newNoteNameString);
      if (!res.success) throw new Error(res.message);

      // Store the note name for navigation in onSuccess
      formElement.__noteName = newNoteNameString;
      formElement.__folder = folder;
      return true;
    },
    // onMutate: async (variables) => {
    //   const queryKey = ['notes', variables.folder, noteSort];

    //   await queryClient.cancelQueries({ queryKey });
    //   const previousNotesData =
    //     queryClient.getQueryData<NotesInfiniteData>(queryKey);

    //   const formData = new FormData(variables.e.target as HTMLFormElement);
    //   const newNoteName = formData.get('note-name')?.toString()?.trim() ?? '';

    //   if (newNoteName && previousNotesData?.pages) {
    //     const newNotePath = new LocalFilePath({
    //       folder: variables.folder,
    //       note: `${newNoteName}.md`,
    //     });

    //     // Add the new note to the first page
    //     const newPages = previousNotesData.pages.map((page, index) => {
    //       if (index === 0) {
    //         return {
    //           ...page,
    //           notes: [newNotePath, ...page.notes],
    //           totalCount: page.totalCount + 1,
    //         };
    //       }
    //       return {
    //         ...page,
    //         totalCount: page.totalCount + 1,
    //       };
    //     });

    //     queryClient.setQueryData<NotesInfiniteData>(queryKey, {
    //       ...previousNotesData,
    //       pages: newPages,
    //     });
    //   }

    //   return { previousNotesData, folder: variables.folder };
    // },
    onSuccess: (result, variables) => {
      const formElement = variables.e.target as NoteFormElementWithMetadata;
      const noteName = formElement.__noteName;
      const folder = formElement.__folder;
      if (result && noteName && folder) {
        const filePath = new LocalFilePath({
          folder,
          note: `${noteName}.md`,
        });
        navigate(filePath.getLinkToNote());
      }
    },
    onError: (error, variables) => {
      // if (context?.previousNotesData && context?.folder) {
      //   queryClient.setQueryData<NotesInfiniteData>(
      //     ['notes', context.folder, noteSort],
      //     context.previousNotesData
      //   );
      // }
      if (error instanceof Error) variables.setErrorText(error.message);
      else
        variables.setErrorText(
          'An unknown error occurred. Please try again later.'
        );
    },
  });
}

export function useNoteRename() {
  const queryClient = useQueryClient();
  const noteSort = useAtomValue(noteSortAtom);

  useWailsEvent('note:rename', async (body) => {
    console.info('note:rename', body);
    const data = body.data as {
      newFolder: string;
      newNote: string;
      oldFolder: string;
      oldNote: string;
    }[];
    for (const item of data) {
      const { newFolder, newNote, oldFolder, oldNote } = item;
      const oldNotePath = new LocalFilePath({
        folder: oldFolder,
        note: oldNote,
      });
      const newNotePath = new LocalFilePath({
        folder: newFolder,
        note: newNote,
      });

      // If folder is the same, update the note in place
      if (oldFolder === newFolder) {
        const queryKey = ['notes', oldFolder, noteSort];
        queryClient.setQueryData<NotesInfiniteData>(queryKey, (oldData) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page) => ({
            ...page,
            notes: page.notes.map((note) =>
              note.equals(oldNotePath) ? newNotePath : note
            ),
          }));
          return { ...oldData, pages: newPages };
        });
      } else {
        // Cross-folder rename: remove from old folder and add to new folder
        const oldQueryKey = ['notes', oldFolder, noteSort];
        queryClient.setQueryData<NotesInfiniteData>(oldQueryKey, (oldData) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page) => ({
            ...page,
            notes: page.notes.filter((note) => !note.equals(oldNotePath)),
            totalCount: page.totalCount - 1,
          }));
          return { ...oldData, pages: newPages };
        });

        const newQueryKey = ['notes', newFolder, noteSort];
        queryClient.setQueryData<NotesInfiniteData>(newQueryKey, (oldData) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page, index) => {
            if (index === 0) {
              return {
                ...page,
                notes: [newNotePath, ...page.notes],
                totalCount: page.totalCount + 1,
              };
            }
            return {
              ...page,
              totalCount: page.totalCount + 1,
            };
          });
          return { ...oldData, pages: newPages };
        });
      }
    }
  });
}

/** This function is used to handle note:delete events */
export function useNoteDelete() {
  const queryClient = useQueryClient();
  const noteSort = useAtomValue(noteSortAtom);

  useWailsEvent('note:delete', async (body) => {
    console.info('note:delete', body);
    const data = body.data as { folder: string; note: string }[];

    // Group deleted notes by folder
    const notesByFolder = new Map<string, LocalFilePath[]>();
    for (const item of data) {
      const { folder, note } = item;
      const notePath = new LocalFilePath({ folder, note });
      const existing = notesByFolder.get(folder) ?? [];
      notesByFolder.set(folder, [...existing, notePath]);
    }

    // Update the cache once per folder
    for (const [folder, notePaths] of notesByFolder) {
      const queryKey = ['notes', folder, noteSort];

      queryClient.setQueryData<NotesInfiniteData>(queryKey, (oldData) => {
        if (!oldData) return oldData;

        // Count how many notes will be removed
        let removedCount = 0;

        // Filter out deleted notes from all pages
        const newPages = oldData.pages.map((page) => {
          const filteredNotes = page.notes.filter((localFilePath) => {
            const shouldRemove = notePaths.some((deletedPath) =>
              localFilePath.equals(deletedPath)
            );
            if (shouldRemove) removedCount++;
            return !shouldRemove;
          });

          return {
            ...page,
            notes: filteredNotes,
          };
        });

        // Update totalCount on all pages
        const pagesWithUpdatedCount = newPages.map((page) => ({
          ...page,
          totalCount: page.totalCount - removedCount,
        }));

        return { ...oldData, pages: pagesWithUpdatedCount };
      });
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

export function useMoveNoteToTrashMutation() {
  const setSelectionRange = useSetAtom(selectionRangeAtom);
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
      setSelectionRange(new Set());
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

export function usePinNotesMutation() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);

  return useMutation({
    mutationFn: async ({
      selectionRange,
      folder,
      shouldPin,
    }: {
      selectionRange: Set<string>;
      folder: string;
      shouldPin: boolean;
    }) => {
      const filePaths = getFilePathFromNoteSelectionRange(
        folder,
        selectionRange
      );
      const newProjectSettings = { ...projectSettings };
      if (shouldPin) {
        filePaths.forEach((filePath) => {
          newProjectSettings.pinnedNotes.add(filePath.toString());
        });
      } else {
        filePaths.forEach((filePath) => {
          newProjectSettings.pinnedNotes.delete(filePath.toString());
        });
      }
      updateProjectSettings({ newProjectSettings });
    },
    // Handle errors that occur during the mutation
    onError: (e) => {
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
      }
    },
  });
}

export function useRenameFileMutation() {
  const queryClient = useQueryClient();
  const noteSort = useAtomValue(noteSortAtom);

  return useMutation({
    mutationFn: async ({
      oldPath,
      newPath,
    }: {
      oldPath: LocalFilePath;
      newPath: LocalFilePath;
      setErrorText: Dispatch<SetStateAction<string>>;
    }) => {
      const res = await RenameFile(oldPath.toString(), newPath.toString());
      if (!res.success) {
        throw new Error(res.message);
      }
      return res.data;
    },
    // Optimistically update cache
    onMutate: async (variables) => {
      const folder = variables.oldPath.folder;
      const queryKey = ['notes', folder, noteSort];

      await queryClient.cancelQueries({ queryKey });

      const previousNotesData =
        queryClient.getQueryData<NotesInfiniteData>(queryKey);

      if (previousNotesData?.pages) {
        // Find the old note in pages and replace it with the new path
        const newPages = previousNotesData.pages.map((page) => ({
          ...page,
          notes: page.notes.map((note) =>
            note.equals(variables.oldPath) ? variables.newPath : note
          ),
        }));

        queryClient.setQueryData<NotesInfiniteData>(queryKey, {
          ...previousNotesData,
          pages: newPages,
        });
      }

      return { previousNotesData, folder };
    },
    onSuccess: () => {
      toast.success('File renamed successfully', DEFAULT_SONNER_OPTIONS);
    },
    onError: (error, variables, context) => {
      // Roll back the cache to the previous notes data if an error occurred during renaming
      if (context?.previousNotesData && context?.folder) {
        queryClient.setQueryData<NotesInfiniteData>(
          ['notes', context.folder, noteSort],
          context.previousNotesData
        );
      }
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

export function useNotePreviewQuery(filePath: LocalFilePath) {
  return useQuery(
    noteQueries.getNotePreview(filePath.folder, filePath.noteWithoutExtension)
  );
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
  const queryClient = useQueryClient();

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

      // Update the appropriate note preview
      const queryKey = noteQueries.getNotePreview(
        folderFromEvent,
        noteWithoutExtension
      ).queryKey;
      queryClient.invalidateQueries({ queryKey });
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

/**
 * Custom hook to handle the "note:create-dialog" Wails event.
 * Opens the create note dialog for the specified folder when the event is received for the current window.
 */
export function useNewNoteEvent(folder: string): void {
  const openCreateNoteDialog = useCreateNoteDialog();

  useWailsEvent('note:create-dialog', async (data) => {
    if (!(await isEventInCurrentWindow(data))) return;
    openCreateNoteDialog(folder);
  });
}
