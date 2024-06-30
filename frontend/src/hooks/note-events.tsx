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
	notes: string[],
	setNotes: Dispatch<SetStateAction<string[] | null>>,
	setNoteCount: Dispatch<SetStateAction<number>>,
) {
	useWailsEvent("note:create", (body) => {
		const data = body.data as { folder: string; note: string }[];

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
			const { noteNameWithoutExtension, queryParams } = extractInfoFromNoteName(
				filteredNotes[filteredNotes.length - 1],
			);
			navigate(
				`/${folder}/${encodeURIComponent(noteNameWithoutExtension)}?ext=${
					queryParams.ext
				}`,
			);
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

			return newNotes;
		});
	});
}

/** This function is used to handle note:context-menu:delete events */
export function useNoteContextMenuDelete(
	folder: string,
	note: string | undefined,
	fileExtension: string | undefined,
	notes: string[] | null,
	setSelectionRange: Dispatch<SetStateAction<Set<string>>>,
) {
	useWailsEvent("note:context-menu:delete", async (event) => {
		const deletedNoteNamesAsString = event.data as string;
		// TODO: This has to be done in a better way because a note name can have a comma in it
		const deletedNoteNamesAsArray = deletedNoteNamesAsString.split(",");

		const paths = deletedNoteNamesAsArray.map((noteName) => {
			const { noteNameWithoutExtension, queryParams } =
				extractInfoFromNoteName(noteName);

			return `/${folder}/${noteNameWithoutExtension}.${queryParams.ext}`;
		});

		try {
			const res = await MoveToTrash(paths);
			if (res.success) {
				toast.success(res.message, DEFAULT_SONNER_OPTIONS);
				// If the current note was deleted, navigate to the first note that was not deleted

				if (
					notes &&
					note &&
					fileExtension &&
					deletedNoteNamesAsArray.includes(`${note}?ext=${fileExtension}`)
				) {
					const firstNoteNotDeleted = notes?.find(
						(name) => !deletedNoteNamesAsArray.includes(name),
					);
					// Go the first note that was not deleted
					if (firstNoteNotDeleted)
						navigate(`/${folder}/${firstNoteNotDeleted}`);
					// Every note was deleted, so go to the folder instead
					else {
						navigate(`/${folder}`);
					}
				}
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
