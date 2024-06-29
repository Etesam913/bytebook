import { Events } from "@wailsio/runtime";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { navigate } from "wouter/use-browser-location";
import { MoveToTrash } from "../../bindings/github.com/etesam913/bytebook/noteservice";
import { getNoteCount } from "../utils/fetch-functions";
import { useWailsEvent } from "../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";
import { extractInfoFromNoteName } from "../utils/string-formatting";

/** This function is used to handle note:create events */
export function useNoteCreate(
	folder: string,
	setNotes: Dispatch<SetStateAction<string[] | null>>,
	setNoteCount: Dispatch<SetStateAction<number>>,
) {
	useWailsEvent("note:create", (body) => {
		const data = body.data as { folder: string; note: string }[];

		getNoteCount(folder, setNoteCount);

		/*
     If none of the added notes are in the current folder, then don't update the notes
     This can be triggered when there are multple windows open 
    */
		const filteredNotes = data.filter(
			(item) => item.folder === decodeURIComponent(folder),
		);

		if (filteredNotes.length === 0) return;

		// Extract the notes
		const notes = filteredNotes.map((item) => item.note);

		// Update the notes state
		setNotes((prev) => (prev ? [...prev, ...notes] : notes));
	});
}
/** This function is used to handle note:delete events */
export function useNoteDelete(
	folder: string,
	note: string | undefined,
	setNotes: Dispatch<SetStateAction<string[] | null>>,
	setNoteCount: Dispatch<SetStateAction<number>>,
	fileExtension: string | undefined,
) {
	useWailsEvent("note:delete", (body) => {
		const data = body.data as { folder: string; note: string }[];

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

			// The note name is encoded for the url so we have to decode it when comparing to file names
			const comparisonNoteName = `${decodeURIComponent(
				note,
			)}?ext=${fileExtension}`;

			// You are on a note that was deleted
			if (
				data.filter(
					({ note: deletedNote }) => deletedNote === comparisonNoteName,
				).length > 0
			) {
				if (newNotes.length > 0) {
					navigate(`/${folder}/${newNotes[0]}`);
				} else {
					navigate(`/${folder}`);
				}
			}

			return newNotes;
		});
	});
}

/** This function is used to handle note:context-menu:delete events */
export function useNoteContextMenuDelete(
	folder: string,
	setSelectionRange: Dispatch<SetStateAction<Set<string>>>,
) {
	useWailsEvent("note:context-menu:delete", async (event) => {
		const noteNamesAsString = event.data as string;
		// TODO: This has to be done in a better way because a note name can have a comma in it
		const noteNamesAsArray = noteNamesAsString.split(",");

		const paths = noteNamesAsArray.map((noteName) => {
			const { noteNameWithoutExtension, queryParams } =
				extractInfoFromNoteName(noteName);

			return `/${folder}/${noteNameWithoutExtension}.${queryParams.ext}`;
		});

		try {
			const res = await MoveToTrash(paths);
			if (res.success) {
				toast.success(res.message, DEFAULT_SONNER_OPTIONS);
			} else {
				throw new Error(res.message);
			}
		} catch (err: unknown) {
			if (err instanceof Error) {
				toast.error(err.message);
			} else {
				toast.error("An Unknown Error Occurred");
			}
		}
		setSelectionRange(new Set());
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
