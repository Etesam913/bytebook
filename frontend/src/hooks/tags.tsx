import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWailsEvent } from './events';
import { TAGS_INDEX_UPDATE } from '../utils/events';
import { logger } from '../utils/logging';
import {
  DeleteTags,
  GetTags,
  GetTagsForNotes,
  SetTagsOnNotes,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/tagsservice';
import { QueryError } from '../utils/query';
import { Dispatch, FormEvent, SetStateAction } from 'react';
import { getFilePathFromNoteSelectionRange } from '../utils/selection';
import { useFilePathFromRoute } from './routes';

/**
 * Handles the `tags-folder:create`, "tags-folder:delete", and "tags:update" events.
 */

export function useTagEvents() {
  const queryClient = useQueryClient();
  const filePath = useFilePathFromRoute();

  useWailsEvent(TAGS_INDEX_UPDATE, () => {
    logger.event(TAGS_INDEX_UPDATE);

    queryClient.invalidateQueries({ queryKey: ['get-tags'] });
    if (filePath) {
      queryClient.invalidateQueries({
        queryKey: ['notes-tags', [filePath.fullPath]],
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
 * @param paths - An array of folder and note paths with .ext at the end
 * @returns A result map containing a map of note paths to their tags
 */
export function useTagsForNotesQuery(paths: string[]) {
  return useQuery({
    queryKey: ['notes-tags', paths],
    queryFn: async (): Promise<Record<string, string[]>> => {
      const res = await GetTagsForNotes(paths);
      if (!res.success) {
        throw new Error(res.message);
      }
      return (res.data ?? {}) as Record<string, string[]>;
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
