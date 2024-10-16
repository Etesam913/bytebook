import { useMutation } from "@tanstack/react-query";
import { Events } from "@wailsio/runtime";
import { useSetAtom } from "jotai/react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import {
	RevealNoteInFinder,
	SendNotesToTrash,
} from "../../bindings/github.com/etesam913/bytebook/noteservice";
import { selectionRangeAtom } from "../atoms";
import { getNoteCount } from "../utils/fetch-functions";
import { useWailsEvent } from "../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";
import { extractInfoFromNoteName } from "../utils/string-formatting";

/** This function is used to handle note:create events */
export function useNoteCreate(
	folder: string,
	notes: string[],
	setNotes: Dispatch<SetStateAction<string[] | null>>,
	setNoteCount: Dispatch<SetStateAction<number>>,
) {
	useWailsEvent("note:create", (body) => {
		const data = (body.data as { folder: string; note: string }[][])[0];
		getNoteCount(folder, setNoteCount);

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
	setNoteCount: Dispatch<SetStateAction<number>>,
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

		getNoteCount(folder, setNoteCount);

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

export function useSendToTrashMutation() {
	return useMutation({
		// The main function that handles sending notes to trash
		mutationFn: async ({
			selectionRange,
			folder,
		}: { selectionRange: Set<string>; folder: string }) => {
			// Map the selection range to folder and note names
			const folderAndNoteNames = [...selectionRange].map((note) => {
				const noteWithoutWithoutPrefix = note.split(":")[1];
				const { noteNameWithoutExtension, queryParams } =
					extractInfoFromNoteName(noteWithoutWithoutPrefix);
				return `${folder}/${noteNameWithoutExtension}.${queryParams.ext}`;
			});
			// BUG: There may be a bug here with undefined note names?
			// Send the notes to trash and handle the response
			const res = await SendNotesToTrash(folderAndNoteNames);
			if (!res.success) throw new Error(res.message);
		},

		// Handle errors that occur during the mutation
		onError: (e) => {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			}
		},
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
