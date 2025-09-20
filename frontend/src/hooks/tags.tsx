import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWailsEvent } from './events';
import {
  DeleteTags,
  GetTags,
  GetTagsForNotes,
  SetTagsOnNotes,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/tagsservice';
import { QueryError } from '../utils/query';
import { useAtomValue } from 'jotai';
import { currentFilePathAtom } from '../atoms';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import { getFilePathFromNoteSelectionRange } from '../utils/selection';
import { FilePath } from '../utils/string-formatting';

/**
 * Handles the `tags-folder:create`, "tags-folder:delete", and "tags:update" events.
 */

export function useTagEvents() {
  const queryClient = useQueryClient();
  const filePath = useAtomValue(currentFilePathAtom);

  useWailsEvent('tags:index_update', () => {
    console.info('tags:index_update');
    // Invalidate the tag previews for each tag
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'tag-preview',
    });

    queryClient.invalidateQueries({ queryKey: ['get-tags'] });
    if (filePath) {
      queryClient.invalidateQueries({
        queryKey: ['notes-tags', [filePath.toString()]],
      });
    }
  });
}

/**
 * Hook to fetch all tags in the project.
 *
 * @returns A query result containing an array of all tags.
 * The query will automatically refetch when tags are created, deleted or updated
 * via the useTags event handlers.
 */
export function useTagsQuery() {
  return useQuery({
    queryKey: ['get-tags'],
    queryFn: async (): Promise<string[]> => {
      const res = await GetTags();
      if (!res.success) {
        throw new QueryError(res.message);
      }
      return res.data ?? [];
    },
  });
}

/**
 *
 * @param folderAndNotesWithExtensions - An array of folder and note paths with .ext at the end
 * @returns A result map containing a map of note paths to their tags
 */
export function useTagsForNotesQuery(folderAndNotesWithExtensions: string[]) {
  return useQuery({
    queryKey: ['notes-tags', folderAndNotesWithExtensions],
    queryFn: async (): Promise<Record<string, string[]>> => {
      const res = await GetTagsForNotes(folderAndNotesWithExtensions);
      if (!res.success) {
        throw new QueryError(res.message);
      }
      return res.data ?? {};
    },
  });
}

/**
 * Custom hook to handle editing tags for notes via form submission.
 * Extracts tag data from form's fieldset data attribute and calls EditTagsForNotes.
 */
export function useEditTagsFormMutation() {
  return useMutation({
    mutationFn: async ({
      e,
      setErrorText,
      selectionRange,
      folder,
    }: {
      e: FormEvent<HTMLFormElement>;
      setErrorText: Dispatch<SetStateAction<string>>;
      selectionRange: Set<string>;
      folder: string;
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

        const filePaths = getFilePathFromNoteSelectionRange(
          folder,
          selectionRange
        );

        const res = await SetTagsOnNotes(
          filePaths.map((filePath) => filePath.toString()),
          tagNamesToAdd,
          tagNamesToRemove
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

/**
 * Deletes a tag from a note. Used for onDelete button in tag in bottom bar
 * @returns The mutation result.
 */
export function useDeleteTagFromNoteMutation(filePath: FilePath) {
  return useMutation({
    mutationFn: async ({ tagToDelete }: { tagToDelete: string }) => {
      const res = await SetTagsOnNotes(
        [filePath.toString()],
        [],
        [tagToDelete]
      );
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });
}

interface DeleteTagsMutationVariables {
  tagsToDelete: string[];
  setErrorText: (error: string) => void;
}

/**
 * Deletes tags from all notes. Used for tag context-menu option.
 * @returns The mutation result.
 */
export function useDeleteTagsMutation() {
  return useMutation({
    mutationFn: async (variables: DeleteTagsMutationVariables) => {
      const res = await DeleteTags(variables.tagsToDelete);
      if (!res.success) {
        throw new Error(res.message);
      }
      return true;
    },
    onError: (error, variables) => {
      const { setErrorText } = variables;
      if (error instanceof Error) {
        setErrorText(error.message);
      }
    },
  });
}
