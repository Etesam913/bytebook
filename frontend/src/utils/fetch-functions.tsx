import type { SetStateAction } from "jotai";
import type { Dispatch } from "react";
import { toast } from "sonner";
import { navigate } from "wouter/use-browser-location";
import {
	DoesFolderExist,
	GetFolders,
} from "../../bindings/github.com/etesam913/bytebook/folderservice";
import { GetNotes } from "../../bindings/github.com/etesam913/bytebook/noteservice";
import { GetNotesFromTag } from "../../bindings/github.com/etesam913/bytebook/tagsservice";
import type { SortStrings } from "../types";
import { DEFAULT_SONNER_OPTIONS } from "./misc";
import { extractInfoFromNoteName } from "./string-formatting";

/**
 * Checks if a folder exists by sending a request to the server.
 * If the folder does not exist, it navigates to a "not-found" page.
 *
 * @param folder - The path to the folder to check.
 */
export async function checkIfFolderExists(folder: string | undefined) {
	// If no folder path is provided, exit the function early.
	if (!folder) return;
	try {
		// Decode the folder path to ensure it's correctly formatted for the request.
		const decodedFolder = decodeURIComponent(folder);
		// Send a request to check if the folder exists.
		const res = await DoesFolderExist(decodedFolder);
		// If the request indicates the folder does not exist, throw an error.
		if (!res.success) {
			throw new Error();
		}
	} catch (e) {
		// If an error occurs, navigate to a "not-found" page with the type set to "folder".
		navigate("/not-found?type=folder", { replace: true });
	}
}

export async function updateTagNotes(
	tagName: string,
	setNotes: Dispatch<SetStateAction<string[] | null>>,
	noteSort: SortStrings,
) {
	try {
		const res = await GetNotesFromTag(tagName, noteSort);
		if (res.success) {
			const notes = res.data;

			if (notes.length > 0) {
				const { noteNameWithoutExtension, queryParams } =
					extractInfoFromNoteName(notes[0]);
				navigate(
					`/tags/${tagName}/${noteNameWithoutExtension}?ext=${queryParams.ext}`,
				);
			}
			setNotes(notes);
		} else {
			throw new Error(res.message);
		}
	} catch (e) {
		if (e instanceof Error) {
			toast.error(e.message);
		}
	}
}

/** Initially fetches folders from filesystem */
export async function updateFolders(
	setFolders: Dispatch<SetStateAction<string[] | null>>,
) {
	try {
		const res = await GetFolders();
		if (res.success) {
			const folders = res.data;
			setFolders(folders);
		} else {
			throw new Error("Failed in retrieving folders");
		}
	} catch (e) {
		if (e instanceof Error) {
			toast.error(e.message);
		}
	}
}

/**
 * Checks if a specific note exists within a given folder.
 * If the note does not exist, it navigates to either the first note in the folder or the folder itself.
 *
 * @param encodedFolder - The path to the folder containing the notes.
 * @param notes - An array of note names within the folder.
 * @param encodedNote - The name of the note to check for existence.
 * @param fileExtension - The file extension of the note.
 */
export async function checkIfNoteExists(
	encodedFolder: string,
	encodedNote: string,
	notes: string[] | null,
	fileExtension: string | undefined,
) {
	// If no note name or file extension is provided, exit the function early.
	if (!encodedNote || !fileExtension) return;
	try {
		// Construct the full path to the note including the folder and file extension.
		const fullPath = `/${decodeURIComponent(encodedFolder)}/${decodeURIComponent(encodedNote)}.${fileExtension}`;
		// Send a request to check if the folder exists (assuming the note path is a folder).
		const res = await DoesFolderExist(fullPath);
		// If the request indicates the folder does not exist, throw an error.
		if (!res.success) {
			throw new Error();
		}
	} catch (e) {
		// If an error occurs, navigate to a suitable location based on the availability of notes.
		if (notes && notes.length > 0) {
			// Extract the base name and query parameters from the first note.
			const { noteNameWithoutExtension, queryParams } = extractInfoFromNoteName(
				notes[0],
			);
			// Navigate to the first note with its extension.
			navigate(
				`/${encodedFolder}/${encodeURIComponent(noteNameWithoutExtension)}?ext=${
					queryParams.ext
				}`,
				{
					replace: true,
				},
			);
		} else {
			// If no notes are available, navigate to the folder.
			navigate(`/${encodedFolder}`, { replace: true });
		}
	}
}

/** Initially fetches notes for a folder using the filesystem and navigates to the first note if it exists*/
export async function updateNotes(
	encodedFolder: string,
	encodedNote: string | undefined,
	setNotes: Dispatch<SetStateAction<string[] | null>>,
	noteSort: SortStrings,
) {
	try {
		const res = await GetNotes(decodeURIComponent(encodedFolder), noteSort);
		if (!res.success) {
			throw new Error("Failed in retrieving notes");
		}

		const notes = res.data;
		setNotes(notes);

		// If the current is not defined, then navigate to the first note so that you are never at an undefined note
		if (!encodedNote) {
			const hasANote = notes.length > 0;
			if (!hasANote) {
				navigate(`/${encodedFolder}`, { replace: true });
				return;
			}
			const indexOfQuestionMark = notes[0].lastIndexOf("?ext=");
			const noteNameWithoutExtension = notes[0].substring(
				0,
				indexOfQuestionMark,
			);
			const fileExtension = notes[0].substring(indexOfQuestionMark + 5);
			const newEncodedNote = `${encodeURIComponent(noteNameWithoutExtension)}?ext=${fileExtension}`;
			navigate(`/${encodedFolder}/${newEncodedNote}`, {
				replace: true,
			});
		}
	} catch (error) {
		toast.error("Error in retrieving notes", DEFAULT_SONNER_OPTIONS);
		setNotes(null);
		return null;
	}
}
