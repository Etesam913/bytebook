import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWailsEvent } from './events';
import {
  DeleteTags,
  GetTags,
  GetTagsForNotes,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/tagsservice';
import { QueryError } from '../utils/query';
import { useAtomValue } from 'jotai';
import { currentFilePathAtom } from '../atoms';

/**
 * Handles the `tags-folder:create`, "tags-folder:delete", and "tags:update" events.
 */

export function useTagEvents() {
  const queryClient = useQueryClient();
  const filePath = useAtomValue(currentFilePathAtom);

  useWailsEvent('tags:index_update', () => {
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

interface DeleteTagsMutationVariables {
  tagsToDelete: string[];
  setErrorText: (error: string) => void;
}

/**
 * Deletes tags from all notes
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
