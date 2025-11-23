import {
  QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAtomValue } from 'jotai/react';
import type { LexicalEditor } from 'lexical';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { toast } from 'sonner';
import { navigate } from 'wouter/use-browser-location';
import {
  AddNoteToFolder,
  DoesNoteExist,
  GetNotePreview,
  GetNotes,
  MoveToTrash,
  RenameFile,
  RevealFolderOrFileInFinder,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { WINDOW_ID } from '../App';
import { noteSortAtom, projectSettingsAtom } from '../atoms';
import { CUSTOM_TRANSFORMERS } from '../components/editor/transformers';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { QueryError } from '../utils/query';
import { getFilePathFromNoteSelectionRange } from '../utils/selection';
import {
  LocalFilePath,
  getContentTypeAndValueFromSelectionRangeValue,
  validateName,
} from '../utils/string-formatting';
import { useWailsEvent } from './events';
import { useUpdateProjectSettingsMutation } from './project-settings';
import type { Frontmatter } from '../types';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { useCreateNoteDialog } from './dialogs';
import { isEventInCurrentWindow } from '../utils/events';
import { parseFrontMatter } from '../components/editor/utils/note-metadata';

export type NotesQueryData = {
  notes: LocalFilePath[];
  previousNotes: LocalFilePath[] | undefined;
};

type NoteFormElementWithMetadata = HTMLFormElement & {
  __noteName?: string;
  __folder?: string;
};

export const noteQueries = {
  getNotes: (folder: string, noteSort: string, queryClient: QueryClient) =>
    queryOptions({
      queryKey: ['notes', folder, noteSort],
      queryFn: async (): Promise<NotesQueryData> => {
        const res = await GetNotes(decodeURIComponent(folder), noteSort);
        if (!res.success) {
          throw new QueryError('Failed in retrieving notes');
        }
        const previousQueryData = queryClient.getQueryData<NotesQueryData>([
          'notes',
          folder,
          noteSort,
        ]);
        const previousNotes = previousQueryData?.notes;
        const notes = (res.data ?? []).map(
          (item) => new LocalFilePath({ folder: item.folder, note: item.note })
        );
        return {
          notes,
          previousNotes: previousNotes || undefined,
        };
      },
    }),
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
};

export function useNotes(curFolder: string) {
  const noteSort = useAtomValue(noteSortAtom);
  const queryClient = useQueryClient();

  return useQuery(noteQueries.getNotes(curFolder, noteSort, queryClient));
}

/** This function is used to handle note:create events */
export function useNoteCreate() {
  const noteSort = useAtomValue(noteSortAtom);
  const queryClient = useQueryClient();

  useWailsEvent('note:create', async (body) => {
    console.info('note:create', body);
    const data = body.data as { folder: string; note: string }[];

    const folderOfLastNote = data[data.length - 1].folder;

    // Refetch notes so that they are updated in the sidebar
    try {
      await queryClient.invalidateQueries({
        queryKey: noteQueries.getNotes(folderOfLastNote, noteSort, queryClient)
          .queryKey,
      });
    } catch {
      toast.error('Failed to update notes', DEFAULT_SONNER_OPTIONS);
    }
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
      const { newFolder, oldFolder } = item;
      await queryClient.invalidateQueries({
        queryKey: noteQueries.getNotes(oldFolder, noteSort, queryClient)
          .queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: noteQueries.getNotes(newFolder, noteSort, queryClient)
          .queryKey,
      });
    }
  });
}

/** This function is used to handle note:delete events */
export function useNoteDelete(folder: string) {
  const queryClient = useQueryClient();
  const noteSort = useAtomValue(noteSortAtom);

  useWailsEvent('note:delete', async () => {
    console.info('note:delete');
    try {
      await queryClient.invalidateQueries({
        queryKey: noteQueries.getNotes(folder, noteSort, queryClient).queryKey,
      });
    } catch {
      toast.error('Failed to update notes', DEFAULT_SONNER_OPTIONS);
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
    // Optimistically update cache
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: noteQueries.getNotes(variables.folder, noteSort, queryClient)
          .queryKey,
      });
      const queryKey = noteQueries.getNotes(
        variables.folder,
        noteSort,
        queryClient
      ).queryKey;
      const previousNotesData =
        queryClient.getQueryData<NotesQueryData>(queryKey);

      const formData = new FormData(variables.e.target as HTMLFormElement);
      const newNoteName = formData.get('note-name')?.toString()?.trim() ?? '';

      if (newNoteName && previousNotesData?.notes) {
        // Create the new note path
        const updatedNotesData: NotesQueryData = {
          notes: [
            ...previousNotesData.notes,
            new LocalFilePath({
              folder: variables.folder,
              note: `${newNoteName}.md`,
            }),
          ],
          previousNotes: previousNotesData.notes || undefined,
        };
        queryClient.setQueryData(queryKey, updatedNotesData);
      }

      return { previousNotesData, folder: variables.folder };
    },
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

      const queryKey = noteQueries.getNotes(
        variables.folder,
        noteSort,
        queryClient
      ).queryKey;

      queryClient.invalidateQueries({
        queryKey,
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousNotesData && context?.folder) {
        queryClient.setQueryData(
          noteQueries.getNotes(context.folder, noteSort, queryClient).queryKey,
          context.previousNotesData
        );
      }
      if (error instanceof Error) variables.setErrorText(error.message);
      else
        variables.setErrorText(
          'An unknown error occurred. Please try again later.'
        );
    },
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

      await queryClient.cancelQueries({
        queryKey: noteQueries.getNotes(folder, noteSort, queryClient).queryKey,
      });

      const getNotesQueryKey = noteQueries.getNotes(
        folder,
        noteSort,
        queryClient
      ).queryKey;

      const previousNotesData = queryClient.getQueryData(getNotesQueryKey);

      if (previousNotesData?.notes) {
        // Find the old note in the current notes and replace it with the new path
        const updatedNotes = previousNotesData.notes.map((note) => {
          if (note.equals(variables.oldPath)) {
            return variables.newPath;
          }
          return note;
        });

        const updatedNotesData: NotesQueryData = {
          notes: updatedNotes,
          previousNotes: previousNotesData.notes || undefined,
        };

        queryClient.setQueryData(getNotesQueryKey, updatedNotesData);
      }

      return { previousNotesData, folder };
    },
    onSuccess: () => {
      toast.success('File renamed successfully', DEFAULT_SONNER_OPTIONS);
    },
    onError: (error, variables, context) => {
      // Roll back the cache to the previous notes data if an error occurred during renaming
      if (context?.previousNotesData && context?.folder) {
        queryClient.setQueryData(
          noteQueries.getNotes(context.folder, noteSort, queryClient).queryKey,
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
 * Hook to handle the "note:changed" event.
 *
 * @param folder - The current folder name.
 * @param note - The current note name.
 * @param editor - The LexicalEditor instance to update the editor state.
 * @param setFrontmatter - A function to update the frontmatter state.
 */
export function useNoteChangedEvent({
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
  useWailsEvent('note:changed', (e) => {
    const data = e.data as {
      folder: string;
      note: string;
      markdown: string;
      oldWindowAppId: string;
    };
    const {
      folder: folderNameFromEvent,
      note: noteNameFromEvent,
      markdown,
      oldWindowAppId,
    } = data;
    if (
      folderNameFromEvent === folder &&
      noteNameFromEvent === note &&
      oldWindowAppId !== WINDOW_ID
    ) {
      editor.update(
        () => {
          $convertFromMarkdownString(
            markdown,
            CUSTOM_TRANSFORMERS,
            undefined,
            true,
            false
          );
        },
        { tag: 'note:changed-from-other-window' }
      );
      const { frontMatter } = parseFrontMatter(markdown);
      setFrontmatter(frontMatter);
    }
    // Update the appropriate note preview
    const queryKey = noteQueries.getNotePreview(
      folderNameFromEvent,
      noteNameFromEvent
    ).queryKey;
    queryClient.invalidateQueries({ queryKey });
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
