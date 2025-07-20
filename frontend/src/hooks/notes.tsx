import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai/react';
import type { LexicalEditor } from 'lexical';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { toast } from 'sonner';
import { navigate } from 'wouter/use-browser-location';
import {
  DoesNoteExist,
  GetNotePreview,
  GetNotes,
  MoveToTrash,
  RenameFile,
  RevealFolderOrFileInFinder,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import {
  DeleteTags,
  EditTagsForNotes,
  GetNotesFromTag,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/tagsservice';
import { WINDOW_ID } from '../App';
import { noteSortAtom, projectSettingsAtom } from '../atoms';
import { CUSTOM_TRANSFORMERS } from '../components/editor/transformers';
import { $convertFromMarkdownStringCorrect } from '../components/editor/utils/note-metadata';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { QueryError } from '../utils/query';
import { findClosestSidebarItemToNavigateTo } from '../utils/routing';
import { getFolderAndNoteFromSelectionRange } from '../utils/selection';
import {
  convertSelectionRangeValueToDotNotation,
  extractInfoFromNoteName,
  getTagNameFromSetValue,
  parseNoteNameFromSelectionRangeValue,
} from '../utils/string-formatting';
import { useWailsEvent } from './events';
import { useUpdateProjectSettingsMutation } from './project-settings';

export function useNotes(
  curFolder: string,
  curNote?: string,
  fileExtension?: string
) {
  const noteSort = useAtomValue(noteSortAtom);
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['notes', curFolder, noteSort],
    queryFn: async () => {
      const res = await GetNotes(decodeURIComponent(curFolder), noteSort);
      if (!res.success) {
        throw new QueryError('Failed in retrieving notes');
      }
      const notes = res.data ?? [];

      const curNoteWithExtension = `${decodeURIComponent(curNote ?? '')}?ext=${fileExtension}`;
      const curNoteExists = notes.some((note) => note === curNoteWithExtension);

      // If the current note does not exist, then navigate to a safe note
      if (!curNoteExists) {
        if (notes.length === 0) {
          navigate(`/${curFolder}`);
        } else {
          let noteIndexToNavigateTo = 0;
          const oldNotesData = queryClient.getQueryData([
            'notes',
            curFolder,
            noteSort,
          ]) as string[] | null;
          if (oldNotesData) {
            noteIndexToNavigateTo = findClosestSidebarItemToNavigateTo(
              curNoteWithExtension,
              oldNotesData,
              notes
            );
          }
          const { noteNameWithoutExtension, queryParams } =
            extractInfoFromNoteName(notes[noteIndexToNavigateTo]);
          navigate(
            `/${curFolder}/${encodeURIComponent(noteNameWithoutExtension)}?ext=${queryParams.ext}`,
            {
              replace: true,
            }
          );
        }
      }
      return notes;
    },
  });
}

export function useNotesFromTag(
  tagName: string,
  curNote?: string,
  fileExtension?: string
) {
  const noteSort = useAtomValue(noteSortAtom);
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['tag-notes', tagName, noteSort],
    queryFn: async () => {
      const res = await GetNotesFromTag(tagName, noteSort);
      if (!res.success) {
        if (res.message === 'tag does not exist') {
          navigate('/', { replace: true });
          return [];
        } else {
          throw new QueryError(
            `Failed in retrieving notes for tag "${tagName}"`
          );
        }
      }
      const notes = res.data ?? [];
      const curNoteWithExtension = `${curNote}?ext=${fileExtension}`;
      const curNoteExists = notes.some((noteAndFolder) => {
        const [, note] = noteAndFolder.split('/');
        return note === curNoteWithExtension;
      });
      // If the current note does not exist, then navigate to a safe note
      if (!curNoteExists) {
        if (notes.length === 0) {
          navigate(`/tags/${tagName}`);
        } else {
          let noteIndexToNavigateTo = 0;
          const oldNotesData = queryClient.getQueryData([
            'tag-notes',
            tagName,
            noteSort,
          ]) as string[] | null;
          if (oldNotesData) {
            noteIndexToNavigateTo = findClosestSidebarItemToNavigateTo(
              curNoteWithExtension,
              oldNotesData,
              notes
            );
          }
          const { noteNameWithoutExtension, queryParams } =
            extractInfoFromNoteName(notes[noteIndexToNavigateTo]);
          const [folder, note] = noteNameWithoutExtension.split('/');
          if (!folder || !note) return [];
          navigate(
            `/tags/${tagName}/${encodeURIComponent(folder)}/${encodeURIComponent(note)}?ext=${queryParams.ext}`,
            { replace: true }
          );
        }
      }
      return notes;
    },
  });
}

/** This function is used to handle note:create events */
export function useNoteCreate() {
  const noteSort = useAtomValue(noteSortAtom);
  const queryClient = useQueryClient();

  useWailsEvent('note:create', async (body) => {
    console.info('note:create', body);
    const data = body.data as { folder: string; note: string }[];

    const folderOfLastNote = data[data.length - 1].folder;
    await queryClient.invalidateQueries({
      queryKey: ['notes', folderOfLastNote, noteSort],
    });
  });
}

/** This function is used to handle note:delete events */
export function useNoteDelete(folder: string) {
  const queryClient = useQueryClient();
  const noteSort = useAtomValue(noteSortAtom);

  useWailsEvent('note:delete', () => {
    console.info('note:delete');
    queryClient.invalidateQueries({ queryKey: ['notes', folder, noteSort] });
  });
}

/**
 * Custom hook to handle note creation events for a specific tag.
 * @param tagName - The name of the tag.
 */
export function useTagNoteCreate(tagName: string) {
  const noteSort = useAtomValue(noteSortAtom);
  const queryClient = useQueryClient();

  useWailsEvent('note:create', async (body) => {
    console.info('note:create', body);
    // Invalidate the queries related to tag notes to ensure the data is up-to-date.
    await queryClient.invalidateQueries({
      queryKey: ['tag-notes', tagName, noteSort],
    });
  });
}

/**
 * Custom hook to handle note deletion events for a specific tag.
 * @param tagName - The name of the tag.
 */
export function useTagNoteDelete(tagName: string) {
  const noteSort = useAtomValue(noteSortAtom);
  const queryClient = useQueryClient();

  useWailsEvent('note:delete', () => {
    console.info('note:delete');
    // Invalidate the queries related to tag notes to ensure the data is up-to-date.
    queryClient.invalidateQueries({
      queryKey: ['tag-notes', tagName, noteSort],
    });
  });
}

/** Custom hook to handle revealing folders in Finder */
export function useNoteRevealInFinderMutation(isInTagsSidebar: boolean) {
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
        selectedNotes.map(async (note) => {
          if (isInTagsSidebar) {
            const { noteNameWithoutExtension, queryParams } =
              parseNoteNameFromSelectionRangeValue(note);
            const [folderName, noteName] = noteNameWithoutExtension.split('/');
            return await RevealFolderOrFileInFinder(
              `notes/${folderName}/${noteName}.${queryParams.ext}`,
              true
            );
          }
          return await RevealFolderOrFileInFinder(
            `notes/${folder}/${convertSelectionRangeValueToDotNotation(note)}`,
            true
          );
        })
      );
      const failedNotes: string[] = [];
      failedNotes.push(
        ...res
          .filter((r) => !r.success)
          .map(
            (_, i) =>
              parseNoteNameFromSelectionRangeValue(selectedNotes[i])
                .noteNameWithoutExtension
          )
      );

      if (failedNotes.length > 0) {
        throw new QueryError(
          `Failed to reveal ${failedNotes.join(', ')} in finder`
        );
      }
    },
  });
}

export function useMoveNoteToTrashMutation(isInTagsSidebar: boolean) {
  return useMutation({
    mutationFn: async ({
      selectionRange,
      folder,
    }: {
      selectionRange: Set<string>;
      folder: string;
    }) => {
      const folderAndNoteNames = getFolderAndNoteFromSelectionRange(
        folder,
        selectionRange,
        isInTagsSidebar
      );
      const res = await MoveToTrash(folderAndNoteNames);
      if (!res.success) throw new Error(res.message);
    },
    onError: (e) => {
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
      }
    },
  });
}

export function usePinNotesMutation(isInTagsSidebar: boolean) {
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
      const folderAndNoteNames = getFolderAndNoteFromSelectionRange(
        folder,
        selectionRange,
        isInTagsSidebar
      );
      const newProjectSettings = { ...projectSettings };
      if (shouldPin) {
        folderAndNoteNames.forEach((folderAndNoteName) => {
          newProjectSettings.pinnedNotes.add(folderAndNoteName);
        });
      } else {
        folderAndNoteNames.forEach((folderAndNoteName) => {
          newProjectSettings.pinnedNotes.delete(folderAndNoteName);
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
  return useMutation({
    mutationFn: async ({
      oldPath,
      newPath,
    }: {
      oldPath: string;
      newPath: string;
    }) => {
      const res = await RenameFile(oldPath, newPath);
      if (!res.success) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onError: (e) => {
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
      }
    },
    onSuccess: () => {
      toast.success('File renamed successfully', DEFAULT_SONNER_OPTIONS);
    },
  });
}

/**
 * Custom hook to handle deleting tags.
 *
 * @param {Object} variables - The variables for the mutation.
 * @param {Set<string>} variables.tagsToDelete - The set of tags to delete. The set items start with the tag: prefix as they come from the `selectionRange` set.
 */
export function useDeleteTagsMutation() {
  return useMutation({
    mutationFn: async ({ tagsToDelete }: { tagsToDelete: Set<string> }) => {
      const tagsToDeleteList = Array.from(tagsToDelete).map((tagWithPrefix) =>
        getTagNameFromSetValue(tagWithPrefix)
      );
      const res = await DeleteTags(tagsToDeleteList);
      if (!res.success) {
        throw new Error(res.message);
      }
      return true;
    },
    onError: (e) => {
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
      }
      return false;
    },
  });
}

export function useEditTagsForNotesMutation(isInTagsSidebar: boolean) {
  return useMutation({
    mutationFn: async ({
      tagNamesToAdd,
      tagNamesToRemove,
      selectionRange,
      folder,
    }: {
      tagNamesToAdd: string[];
      tagNamesToRemove: string[];
      selectionRange: Set<string>;
      folder: string;
    }) => {
      const folderAndNotePaths = getFolderAndNoteFromSelectionRange(
        folder,
        selectionRange,
        isInTagsSidebar
      );

      const res = await EditTagsForNotes(
        tagNamesToAdd,
        tagNamesToRemove,
        folderAndNotePaths
      );
      if (!res.success) {
        throw new Error(res.message);
      }

      // // Invalidate the queries related to tag notes to ensure the data is up-to-date.
      // await queryClient.invalidateQueries({
      //   queryKey: ['notes-tags', folder, folderAndNotePaths],
      // });

      return true;
    },
    onError: (e) => {
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
      }
      return false;
    },
  });
}

/**
 * Custom hook to handle editing tags for notes via form submission.
 * Extracts tag data from form's fieldset data attribute and calls EditTagsForNotes.
 */
export function useEditTagsMutation() {
  return useMutation({
    mutationFn: async ({
      e,
      setErrorText,
      selectionRange,
      folder,
      isInTagsSidebar,
    }: {
      e: FormEvent<HTMLFormElement>;
      setErrorText: Dispatch<SetStateAction<string>>;
      selectionRange: Set<string>;
      folder: string;
      isInTagsSidebar: boolean;
    }) => {
      try {
        // Get the tags to add or delete from the data attribute
        const fieldset = (e.target as HTMLFormElement).querySelector(
          'fieldset[data-tags-to-add-or-remove]'
        ) as HTMLFieldSetElement;

        const tagsData = fieldset?.getAttribute('data-tags-to-add-or-remove');
        const { tagNamesToAdd, tagNamesToRemove } = tagsData
          ? JSON.parse(tagsData)
          : { tagNamesToAdd: [], tagNamesToRemove: [] };

        const folderAndNotePaths = getFolderAndNoteFromSelectionRange(
          folder,
          selectionRange,
          isInTagsSidebar
        );

        const res = await EditTagsForNotes(
          tagNamesToAdd,
          tagNamesToRemove,
          folderAndNotePaths
        );

        if (!res.success) {
          throw new QueryError(res.message);
        }

        return true;
      } catch (error) {
        setErrorText(
          error instanceof Error ? error.message : 'Failed to set tags'
        );
        return false;
      }
    },
  });
}

export function useNotePreviewQuery(
  curFolder: string,
  sidebarNoteName: string,
  fileExtension: string
) {
  return useQuery({
    queryKey: ['note-preview', curFolder, sidebarNoteName],
    queryFn: () =>
      GetNotePreview(`notes/${curFolder}/${sidebarNoteName}.${fileExtension}`),
  });
}

/**
 * Hook to handle the "note:changed" event.
 *
 * @param folder - The current folder name.
 * @param note - The current note name.
 * @param editor - The LexicalEditor instance to update the editor state.
 * @param setFrontmatter - A function to update the frontmatter state.
 */
export function useNoteChangedEvent(
  folder: string,
  note: string,
  editor: LexicalEditor,
  setFrontmatter: Dispatch<SetStateAction<Record<string, string>>>
) {
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
          $convertFromMarkdownStringCorrect(
            markdown,
            CUSTOM_TRANSFORMERS,
            setFrontmatter
          );
        },
        { tag: 'note:changed-from-other-window' }
      );
    }
    // Update the appropriate note preview
    const queryKey = ['note-preview', folderNameFromEvent, noteNameFromEvent];
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
export function useNoteExists(
  folder: string,
  note: string | undefined,
  fileExtension: string | undefined
) {
  return useQuery({
    queryKey: ['doesNoteExist', folder, note, fileExtension],
    queryFn: () => {
      if (!note) {
        return false;
      }
      return DoesNoteExist(
        `${folder}/${decodeURIComponent(note)}.${fileExtension}`
      );
    },
    enabled: !!note,
  });
}
