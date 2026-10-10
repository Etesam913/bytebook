import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWailsEvent } from './events';
import { TAGS_INDEX_UPDATE } from '@utils/events';
import { logger } from '@utils/logging';
import {
  DeleteTags,
  GetTags,
  GetTagsForNotes,
  SetTagsOnNotes,
} from '@bindings/services/tagsservice';
import { getBackendResponseData } from '@utils/query';
import { queryKeys } from '@utils/query-keys';
import { Dispatch, SetStateAction } from 'react';

/**
 * Handles the `tags-folder:create`, "tags-folder:delete", and "tags:update" events.
 */

export function useTagEvents() {
  const queryClient = useQueryClient();

  useWailsEvent(TAGS_INDEX_UPDATE, () => {
    logger.event(TAGS_INDEX_UPDATE);

    void queryClient.invalidateQueries({ queryKey: queryKeys.tags() });
    // Prefix invalidation: notes-tags queries are keyed by an array of paths
    // (possibly multiple, e.g. the edit-tag dialog), so a single-path key
    // would never partial-match them.
    void queryClient.invalidateQueries({
      queryKey: queryKeys.notesTagsAll(),
    });
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
    queryKey: queryKeys.tags(),
    queryFn: async (): Promise<string[]> =>
      (await getBackendResponseData(GetTags())) ?? [],
  });
}

/**
 * @param paths - Note paths with extensions
 * @returns A map of note path to its tags
 */
export function useTagsForNotesQuery(paths: string[]) {
  return useQuery({
    queryKey: queryKeys.notesTags(paths),
    queryFn: async (): Promise<Record<string, string[]>> => {
      const data = await getBackendResponseData(GetTagsForNotes(paths));
      return (data ?? {}) as Record<string, string[]>;
    },
  });
}

type EditTagsFormMutationVariables = {
  formData: FormData;
  setErrorText: Dispatch<SetStateAction<string>>;
  filePaths: string[];
};

/**
 * Custom hook to handle editing tags for notes via form submission.
 * Extracts tag data from the submitted FormData and calls SetTagsOnNotes.
 */
export function useEditTagsFormMutation() {
  return useMutation({
    mutationFn: async ({
      formData,
      filePaths,
    }: EditTagsFormMutationVariables) => {
      const tagNamesToAdd = JSON.parse(
        (formData.get('tag-names-to-add') as string) ?? '[]'
      ) as string[];
      const tagNamesToRemove = JSON.parse(
        (formData.get('tag-names-to-remove') as string) ?? '[]'
      ) as string[];

      await getBackendResponseData(
        SetTagsOnNotes(filePaths, tagNamesToAdd, tagNamesToRemove)
      );
      return true;
    },
    onError: (error, variables) => {
      const { setErrorText } = variables;
      setErrorText(
        error instanceof Error ? error.message : 'Failed to set tags'
      );
    },
  });
}

/**
 * Removes a single tag from a specific note/attachment.
 * Invalidates the tags query on success so the UI updates.
 */
export function useDeleteTagFromNoteMutation(filePath: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tagToDelete }: { tagToDelete: string }) => {
      await getBackendResponseData(
        SetTagsOnNotes([filePath], [], [tagToDelete])
      );
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notesTagsAll(),
      });
    },
  });
}

type DeleteTagsMutationVariables = {
  tagsToDelete: string[];
  setErrorText: (error: string) => void;
};

/**
 * Deletes tags from all notes. Used for tag context-menu option.
 * @returns The mutation result.
 */
export function useDeleteTagsMutation() {
  return useMutation({
    mutationFn: async (variables: DeleteTagsMutationVariables) => {
      await getBackendResponseData(DeleteTags(variables.tagsToDelete));
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
