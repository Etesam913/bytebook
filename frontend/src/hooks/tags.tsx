import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { useWailsEvent } from './events';
import { useSearchParamsEntries } from '../utils/routing';
import {
  GetTags,
  GetTagsForNotes,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/tagsservice';
import { QueryError } from '../utils/query';

/**
 * Handles the `tags-folder:create`, "tags-folder:delete", and "tags:update" events.
 */
export function useTagEvents() {
  const queryClient = useQueryClient();
  const [isInNotesSidebar, notesSidebarRouteParams] =
    useRoute('/:folder/:note?');

  const searchParams: { ext?: string } = useSearchParamsEntries();
  let folderAndNotePath: string | null = null;
  if (isInNotesSidebar) {
    const { folder, note } = notesSidebarRouteParams;
    if (note) {
      folderAndNotePath = `${folder}/${note}.${searchParams.ext}`;
    }
  }

  useWailsEvent('tags:index_update', () => {
    // Invalidate the tag previews for each tag
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'tag-preview',
    });

    queryClient.invalidateQueries({ queryKey: ['get-tags'] });
    if (folderAndNotePath) {
      queryClient.invalidateQueries({
        queryKey: ['notes-tags', [folderAndNotePath]],
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
      console.log('res.data', res.data);
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
 * Deletes a tag from a specific note within a folder.
 *
 * @param queryClient - The react-query client for managing queries.
 * @param folder - The folder containing the note.
 * @param note - The note from which the tag is being deleted.
 * @param ext - The file extension of the note.
 * @returns The mutation result.
 */
export function useDeleteTagsMutation() {
  return useMutation({
    mutationFn: async () => {
      //   const res = await DeleteTagsFromNotes(
      //     [tagName],
      //     [`${folder}/${note}.${ext}`]
      //   );
      //   if (!res.success) {
      //     throw new QueryError(res.message);
      //   }
    },
  });
}
