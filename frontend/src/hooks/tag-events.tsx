import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { type StringRouteParams, useRoute } from 'wouter';
import {
  DeleteTagsFromNotes,
  GetTags,
  GetTagsForNotes,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/tagsservice';
import { noteSortAtom } from '../atoms';
import { useWailsEvent } from '../hooks/events';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { useSearchParamsEntries } from '../utils/routing';

/**
 * Invalidates the query for note tags if the current folder, note, and extension are available.
 *
 * @param queryClient - The TanStack Query QueryClient instance.
 * @param routeParams - Route parameters containing folder and note.
 * @param searchParams - Search parameters, possibly including an extension.
 */
function invalidateCurrentNoteTagsQueryIfNeeded(
  queryClient: QueryClient,
  routeParams: StringRouteParams<'/:folder/:note?'> | null,
  searchParams: { ext?: string }
) {
  const currentFolder = routeParams?.folder;
  const currentNote = routeParams?.note;

  if (currentFolder && currentNote && searchParams.ext) {
    queryClient.invalidateQueries({
      queryKey: [
        'notes-tags',
        currentFolder,
        [`${currentNote}.${searchParams.ext}`],
      ],
    });
  }
}

/**
 * Handles tag related events by invalidating the 'get-tags' query and conditionally invalidating the 'note-tags' query.
 *
 * @param queryClient - The TanStack Query QueryClient instance.
 * @param routeParams - Route parameters containing folder and note.
 * @param searchParams - Search parameters, possibly including an extension.
 */
function handleTagRelatedEvent(
  queryClient: QueryClient,
  routeParams: StringRouteParams<'/:folder/:note?'> | null,
  searchParams: { ext?: string }
) {
  queryClient.invalidateQueries({ queryKey: ['get-tags'] });
  invalidateCurrentNoteTagsQueryIfNeeded(
    queryClient,
    routeParams,
    searchParams
  );
}

/**
 * Handles the `tags-folder:create`, "tags-folder:delete", and "tags:update" events.
 */
export function useTags() {
  const queryClient = useQueryClient();
  const [, routeParams] = useRoute('/:folder/:note?');
  const searchParams: { ext?: string } = useSearchParamsEntries();
  const noteSort = useAtomValue(noteSortAtom);
  useWailsEvent('tags-folder:create', () => {
    handleTagRelatedEvent(queryClient, routeParams, searchParams);
  });
  useWailsEvent('tags-folder:delete', () => {
    handleTagRelatedEvent(queryClient, routeParams, searchParams);
  });
  useWailsEvent('tags:update', (body) => {
    const data = body.data as { notes: string[] | null; tagName: string }[];
    const updatedTag = data[0].tagName;

    // Update the notes present in tags-sidebar
    queryClient.invalidateQueries({
      queryKey: ['tag-notes', updatedTag, noteSort],
    });

    // Invalidate the tag previews for each tag
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'tag-preview',
    });

    handleTagRelatedEvent(queryClient, routeParams, searchParams);
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
    queryFn: async () => {
      const res = await GetTags();
      if (!res.success) {
        throw new Error(res.message);
      }
      const tags = res.data;
      return tags;
    },
  });
}

/**
 *
 * @param folder - The folder containing the note.
 * @param notesWithExtensions - An array of note paths with ext query param at the end
 * @returns
 */
export function useTagsForNotesQuery(
  folder: string,
  notesWithExtensions: string[]
) {
  return useQuery({
    queryKey: ['notes-tags', folder, notesWithExtensions],
    queryFn: async () => {
      const res = await GetTagsForNotes(
        notesWithExtensions.map((note) => `${folder}/${note}`)
      );
      if (!res.success) {
        throw new Error(res.message);
      }
      return res.data;
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
export function useDeleteTagsMutation(
  folder: string,
  note: string,
  ext: string
) {
  return useMutation({
    mutationFn: async ({ tagName }: { tagName: string }) => {
      const res = await DeleteTagsFromNotes(
        [tagName],
        [`${folder}/${note}.${ext}`]
      );
      if (!res.success) {
        throw new Error(res.message);
      }
    },
    onError: (e) => {
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
      }
    },
  });
}
