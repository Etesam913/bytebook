import { type QueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	DeletePathFromTag,
	GetTags,
	GetTagsForFolderAndNotePath,
	GetTagsForFolderAndNotesPaths,
} from "../../bindings/github.com/etesam913/bytebook/tagsservice";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";

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
			const res = await GetTagsForFolderAndNotePath(
				`${folder}/${note}?ext=${ext}`,
			);
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
			const res = await GetTagsForFolderAndNotesPaths(
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
export function useDeleteTagMutation(
	queryClient: QueryClient,
	folder: string,
	note: string,
	ext: string,
) {
	return useMutation({
		mutationFn: async ({ tagName }: { tagName: string }) => {
			const res = await DeletePathFromTag(tagName, `${folder}/${note}.${ext}`);
			if (!res.success) {
				throw new Error(res.message);
			}
		},
		onError: (e) => {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["note-tags", folder, note, ext],
			});
			queryClient.invalidateQueries({ queryKey: ["get-tags"] });
		},
	});
}
