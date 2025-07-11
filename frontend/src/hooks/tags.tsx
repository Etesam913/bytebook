import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useRoute } from 'wouter';
import {
  CreateTags,
  DeleteTagsFromNotes,
  GetTags,
  GetTagsForNotes,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/tagsservice';
import { noteSortAtom } from '../atoms';
import { useWailsEvent } from './events';
import { useSearchParamsEntries } from '../utils/routing';
import { QueryError } from '../utils/query';

/**
 * Invalidates the query for note tags if the current folder, note, and extension are available.
 *
 * @param queryClient - The TanStack Query QueryClient instance.
 * @param routeParams - Route parameters containing folder and note.
 * @param searchParams - Search parameters, possibly including an extension.
 */
function invalidateCurrentNoteTagsQueryIfNeeded(
  queryClient: QueryClient,
  folderNotePath: string | null
) {
  if (folderNotePath) {
    queryClient.invalidateQueries({
      queryKey: ['notes-tags', [folderNotePath]],
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
  folderNotePath: string | null
) {
  queryClient.invalidateQueries({ queryKey: ['get-tags'] });
  invalidateCurrentNoteTagsQueryIfNeeded(queryClient, folderNotePath);
}

/**
 * Handles the `tags-folder:create`, "tags-folder:delete", and "tags:update" events.
 */
export function useTagEvents() {
  const queryClient = useQueryClient();
  const [isInNotesSidebar, notesSidebarRouteParams] =
    useRoute('/:folder/:note?');
  const [isInTagsSidebar, tagsSidebarRouteParams] = useRoute(
    '/tags/:tagName/:folder?/:note?'
  );

  const searchParams: { ext?: string } = useSearchParamsEntries();
  let folderAndNotePath: string | null = null;
  if (isInNotesSidebar) {
    const { folder, note } = notesSidebarRouteParams;
    if (note) {
      folderAndNotePath = `${folder}/${note}.${searchParams.ext}`;
    }
  } else if (isInTagsSidebar) {
    const { folder, note } = tagsSidebarRouteParams as {
      tagName: string;
      folder?: string;
      note?: string;
    };
    if (note && folder) {
      folderAndNotePath = `${folder}/${note}.${searchParams.ext}`;
    }
  }

  const noteSort = useAtomValue(noteSortAtom);
  useWailsEvent('tags-folder:create', () => {
    console.info('tags-folder:create');
    handleTagRelatedEvent(queryClient, folderAndNotePath);
  });
  useWailsEvent('tags-folder:delete', (body) => {
    console.info('tags-folder:delete', body);
    const data = body.data as { folder: string }[][];
    const folders = data[0].map((obj) => obj.folder);
    folders.forEach((folder) => {
      queryClient.invalidateQueries({
        queryKey: ['tag-notes', folder, noteSort],
      });
    });
    handleTagRelatedEvent(queryClient, folderAndNotePath);
  });
  useWailsEvent('tags:update', (body) => {
    const data = body.data as { notes: string[] | null; tagName: string };
    const updatedTag = data.tagName;

    // Update the notes present in tags-sidebar
    queryClient.invalidateQueries({
      queryKey: ['tag-notes', updatedTag, noteSort],
    });

    // Invalidate the tag previews for each tag
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'tag-preview',
    });

    handleTagRelatedEvent(queryClient, folderAndNotePath);
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
export function useTagsForNotesQuery(folderAndNotesWithExtensions: string[]) {
  return useQuery({
    queryKey: ['notes-tags', folderAndNotesWithExtensions],
    queryFn: async () => {
      const res = await GetTagsForNotes(folderAndNotesWithExtensions);
      if (!res.success) {
        throw new Error(res.message);
      }
      return res.data;
    },
  });
}

/**
 * Creates a tag.
 *
 * @returns The mutation result.
 */
export function useCreateTagsMutation() {
  return useMutation({
    mutationFn: async ({ tagNames }: { tagNames: string[] }) => {
      const res = await CreateTags(tagNames);
      if (!res.success) {
        throw new QueryError(res.message);
      }
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
        throw new QueryError(res.message);
      }
    },
  });
}
