import { Events } from "@wailsio/runtime";
import { useSetAtom } from "jotai/react";
import type { Dispatch, SetStateAction } from "react";
import { selectionRangeAtom } from "../atoms";
import { getNoteCount } from "../utils/fetch-functions";
import { useWailsEvent } from "../utils/hooks";

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
