import { type QueryClient, useMutation } from "@tanstack/react-query";
import { Events } from "@wailsio/runtime";
import { useAtomValue, useSetAtom } from "jotai/react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { toast } from "sonner";
import {
	MoveToTrash,
	RevealNoteInFinder,
} from "../../bindings/github.com/etesam913/bytebook/noteservice";
import { AddPathsToTags } from "../../bindings/github.com/etesam913/bytebook/tagsservice";
import { projectSettingsAtom, selectionRangeAtom } from "../atoms";
import { useWailsEvent } from "../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";
import { getFolderAndNoteFromSelectionRange } from "../utils/selection";
import { extractInfoFromNoteName } from "../utils/string-formatting";
import { useUpdateProjectSettingsMutation } from "./project-settings";

/** This function is used to handle note:create events */
export function useNoteCreate(
	folder: string,
	notes: string[],
	setNotes: Dispatch<SetStateAction<string[] | null>>,
) {
	useWailsEvent("note:create", (body) => {
		const data = (body.data as { folder: string; note: string }[][])[0];

		/*
		If none of the added notes are in the current folder, then don't update the notes
		This can be triggered when there are multple windows open

		There is notes.includes to deal with the Untitled Note race condition
    */
		const filteredNotes = data
			.filter(
				(item) =>
					item.folder === decodeURIComponent(folder) &&
					!notes.includes(item.note),
			)
			.map((item) => item.note);

		if (filteredNotes.length === 0) return;

		// Update the notes state
		setNotes((prev) => {
			if (!prev) return filteredNotes;
			return [...prev, ...filteredNotes];
		});
	});
}
/** This function is used to handle note:delete events */
export function useNoteDelete(
	folder: string,
	note: string | undefined,
	setNotes: Dispatch<SetStateAction<string[] | null>>,
) {
	useWailsEvent("note:delete", (body) => {
		const data = (body.data as { folder: string; note: string }[][])[0];

		/*
     If none of the deleted notes are in the current folder, then don't update the notes
     This can be triggered when there are multple windows open
    */
		if (
			data.filter(
				({ folder: folderWithDeletedNotes }) =>
					folderWithDeletedNotes === decodeURIComponent(folderWithDeletedNotes),
			).length === 0
		)
			return;

		setNotes((prev) => {
			if (!prev) return prev;
			// Filter out all notes that are in the same folder as a deleted note/
			const newNotes = prev.filter(
				(noteName) =>
					!data.some(
						({ folder: folderWithDeletedNotes, note: deletedNote }) =>
							folder === folderWithDeletedNotes && noteName === deletedNote,
					),
			);
			if (!note) return newNotes;

			return newNotes;
		});
	});
}

/** This function is used to handle note:open-in-new-window events */
export function useNoteOpenInNewWindow(
	folder: string,
	selectionRange: Set<string>,
	setSelectionRange: Dispatch<SetStateAction<Set<string>>>,
) {
	useWailsEvent("note:open-in-new-window", () => {
		for (const noteNameWithQueryParam of selectionRange) {
			Events.Emit({
				name: "open-note-in-new-window-backend",
				data: { url: `/${folder}/${noteNameWithQueryParam}` },
			});
		}
		setSelectionRange(new Set());
	});
}

export function useNoteSelectionClear() {
	const setSelectionRange = useSetAtom(selectionRangeAtom);
	useWailsEvent("note:clear-selection", () => {
		setSelectionRange(new Set());
	});
}

/** Custom hook to handle revealing folders in Finder */
export function useNoteRevealInFinderMutation() {
	return useMutation({
		// The main function that handles revealing folders in Finder
		mutationFn: async ({
			selectionRange,
			folder,
		}: { selectionRange: Set<string>; folder: string }) => {
			// Limit the number of folders to reveal to 5
			const selectedFolders = [...selectionRange].slice(0, 5);

			// Reveal each selected folder in Finder
			const res = await Promise.all(
				selectedFolders.map(async (note) => {
					const noteWithoutWithoutPrefix = note.split(":")[1];
					const { noteNameWithoutExtension, queryParams } =
						extractInfoFromNoteName(noteWithoutWithoutPrefix);
					return await RevealNoteInFinder(
						folder,
						`${noteNameWithoutExtension}.${queryParams.ext}`,
					);
				}),
			);

			// Check if any folder failed to reveal
			if (res.some((r) => !r.success)) {
				throw new Error("Failed to reveal folder in finder");
			}
		},
		// Handle errors that occur during the mutation
		onError: (e) => {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			}
		},
	});
}

export function useMoveNoteToTrashMutation() {
	return useMutation({
		mutationFn: async ({
			selectionRange,
			folder,
		}: { selectionRange: Set<string>; folder: string }) => {
			const folderAndNoteNames = getFolderAndNoteFromSelectionRange(
				folder,
				selectionRange,
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

export function usePinNotesMutation() {
	const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
	const projectSettings = useAtomValue(projectSettingsAtom);

	return useMutation({
		mutationFn: async ({
			selectionRange,
			folder,
			shouldPin,
		}: { selectionRange: Set<string>; folder: string; shouldPin: boolean }) => {
			const folderAndNoteNames = getFolderAndNoteFromSelectionRange(
				folder,
				selectionRange,
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

type AddTagsMutationVariables = {
	e: FormEvent<HTMLFormElement>;
	setErrorText: Dispatch<SetStateAction<string>>;
	folder: string;
	selectionRange: Set<string>;
	note: string;
	ext: string;
};

export function useAddTagsMutation(queryClient: QueryClient) {
	return useMutation({
		// The main function that handles adding tags to a note
		mutationFn: async ({
			e,
			folder,
			setErrorText,
			selectionRange,
		}: AddTagsMutationVariables) => {
			const formData = new FormData(e.target as HTMLFormElement);
			const tags = formData.getAll("tags");
			if (tags.length === 0) {
				setErrorText("You need to add a tag before confirming.");
				return false;
			}
			const tagsStrings = tags.map((tag) => tag.toString());
			const folderAndNotePaths = [...selectionRange].map(
				(noteWithQueryParam) => {
					const noteWithQueryParamWithoutPrefix =
						noteWithQueryParam.split(":")[1];
					const { noteNameWithoutExtension, queryParams } =
						extractInfoFromNoteName(noteWithQueryParamWithoutPrefix);

					return `${folder}/${noteNameWithoutExtension}.${queryParams.ext}`;
				},
			);
			// Add the tags to each selected note
			const addTagsRes = await AddPathsToTags(tagsStrings, folderAndNotePaths);

			if (!addTagsRes.success) {
				throw new Error(addTagsRes.message);
			}

			return true;
		},
		onSuccess: (_, variables: AddTagsMutationVariables) => {
			queryClient.invalidateQueries({
				queryKey: [
					"note-tags",
					variables.folder,
					variables.note,
					variables.ext,
				],
			});
			queryClient.invalidateQueries({ queryKey: ["get-tags"] });
		},
		// Handle errors that occur during the mutation
		onError: (e) => {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			}
			return false;
		},
	});
}
