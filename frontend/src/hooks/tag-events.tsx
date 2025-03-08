import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { type StringRouteParams, useRoute } from "wouter";
import {
	DeleteTagsFromNotes,
	GetTags,
	GetTagsForNotes,
} from "../../bindings/github.com/etesam913/bytebook/services/tagsservice";
import { useWailsEvent } from "../hooks/events";
import { DEFAULT_SONNER_OPTIONS } from "../utils/general";
import { useSearchParamsEntries } from "../utils/routing";
import { useAtomValue } from "jotai";
import { noteSortAtom } from "../atoms";

/**
 * Invalidates the query for note tags if the current folder, note, and extension are available.
 *
 * @param queryClient - The TanStack Query QueryClient instance.
 * @param routeParams - Route parameters containing folder and note.
 * @param searchParams - Search parameters, possibly including an extension.
 */
function invalidateCurrentNoteTagsQueryIfNeeded(
	queryClient: QueryClient,
	routeParams: StringRouteParams<"/:folder/:note?"> | null,
	searchParams: { ext?: string },
) {
	const currentFolder = routeParams?.folder;
	const currentNote = routeParams?.note;

	if (currentFolder && currentNote && searchParams.ext) {
		queryClient.invalidateQueries({
			queryKey: ["note-tags", currentFolder, currentNote, searchParams.ext],
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
	routeParams: StringRouteParams<"/:folder/:note?"> | null,
	searchParams: { ext?: string },
) {
	queryClient.invalidateQueries({ queryKey: ["get-tags"] });
	invalidateCurrentNoteTagsQueryIfNeeded(
		queryClient,
		routeParams,
		searchParams,
	);
}

/**
 * Handles the `tags-folder:create`, "tags-folder:delete", and "tags:update" events.
 */
export function useTags() {
	const queryClient = useQueryClient();
	const [, routeParams] = useRoute("/:folder/:note?");
	const searchParams: { ext?: string } = useSearchParamsEntries();
	const noteSort = useAtomValue(noteSortAtom);
	useWailsEvent("tags-folder:create", () => {
		handleTagRelatedEvent(queryClient, routeParams, searchParams);
	});
	useWailsEvent("tags-folder:delete", () => {
		handleTagRelatedEvent(queryClient, routeParams, searchParams);
	});
	useWailsEvent("tags:update", (body) => {
		const data = body.data as { notes: string[] | null; tagName: string }[];
		const updatedTag = data[0].tagName;

		// Update the notes present in tags-sidebar
		queryClient.invalidateQueries({
			queryKey: ["tag-notes", updatedTag, noteSort],
		});
		handleTagRelatedEvent(queryClient, routeParams, searchParams);
	});
}

export function useTagsQuery() {
	return useQuery({
		queryKey: ["get-tags"],
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
 * Fetches tags for a specific note within a folder.
 *
 * @param  folder - The folder containing the note.
 * @param  note - The note for which tags are being fetched.
 * @param  ext - The file extension of the note.
 * @returns  The query result containing the tags.
 */
export function useTagsForNoteQuery(folder: string, note: string, ext: string) {
	return useQuery({
		queryKey: ["note-tags", folder, note, ext],
		queryFn: async () => {
			const res = await GetTagsForNotes([`${folder}/${note}.${ext}`]);
			return res.data;
		},
	});
}

/**
 *
 * @param folder
 * @param notes - An array of note paths with ext query param at the end
 * @returns
 */
export function useTagsForNotesQuery(folder: string, notes: string[]) {
	return useQuery({
		queryKey: ["notes-tags", folder, notes],
		queryFn: async () => {
			const res = await GetTagsForNotes(
				notes.map((note) => `${folder}/${note}`),
			);
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
	ext: string,
) {
	return useMutation({
		mutationFn: async ({ tagName }: { tagName: string }) => {
			const res = await DeleteTagsFromNotes(
				[tagName],
				[`${folder}/${note}.${ext}`],
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
