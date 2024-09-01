import type { SetStateAction } from "jotai";
import type { Dispatch } from "react";
import { toast } from "sonner";
import { navigate } from "wouter/use-browser-location";
import {
	DoesFolderExist,
	GetFolders,
} from "../../bindings/github.com/etesam913/bytebook/folderservice";
import {
	GetNoteCount,
	GetNotes,
} from "../../bindings/github.com/etesam913/bytebook/noteservice";
import type { SortStrings } from "../types";
import { DEFAULT_SONNER_OPTIONS } from "./misc";
import { extractInfoFromNoteName } from "./string-formatting";

export async function checkIfFolderExists(folder: string | undefined) {
	if (!folder) return;
	try {
		const res = await DoesFolderExist(folder);
		if (!res.success) {
			throw new Error();
		}
	} catch (e) {
		navigate("/not-found?type=folder", { replace: true });
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

export async function checkIfNoteExists(
	folder: string,
	notes: string[] | null,
	note: string | undefined,
	fileExtension: string | undefined,
) {
	if (!note || !fileExtension) return;
	try {
		const res = await DoesFolderExist(`/${folder}/${note}.${fileExtension}`);
		if (!res.success) {
			throw new Error();
		}
	} catch (e) {
		// Navigate to the first note if the note does not exist
		if (notes && notes.length > 0) {
			const { noteNameWithoutExtension, queryParams } = extractInfoFromNoteName(
				notes[0],
			);
			navigate(
				`/${folder}/${encodeURIComponent(noteNameWithoutExtension)}?ext=${
					queryParams.ext
				}`,
				{
					replace: true,
				},
			);
		}
		// Navigate to the folder if the note does not exist
		else {
			navigate(`/${folder}`, { replace: true });
		}
	}
}

/** Initially fetches notes for a folder using the filesystem */
export async function updateNotes(
	folder: string,
	note: string | undefined,
	setNotes: Dispatch<SetStateAction<string[] | null>>,
	noteSort: SortStrings,
) {
	try {
		// @ts-expect-error -- The sort option is a custom type
		const res = await GetNotes(decodeURIComponent(folder), noteSort);

		if (!res.success) {
			throw new Error("Failed in retrieving notes");
		}

		const notes = res.data;
		setNotes(notes);

		// If the current is not defined, then navigate to the first note so that you are never at an undefined note
		if (!note) {
			const hasANote = notes.length > 0;
			if (!hasANote) {
				navigate(`/${folder}`, { replace: true });
				return;
			}
			// We have to extract the note name from the first note so that we can encode it to then navigate to it
			const { noteNameWithoutExtension, queryParams } = extractInfoFromNoteName(
				notes[0],
			);
			navigate(
				`/${folder}/${encodeURIComponent(noteNameWithoutExtension)}?ext=${
					queryParams.ext
				}`,
				{
					replace: true,
				},
			);
		}
	} catch (error) {
		toast.error("Error in retrieving notes", DEFAULT_SONNER_OPTIONS);
		setNotes(null);
	}
}

export async function getNoteCount(
	folder: string,
	setNoteCount: Dispatch<SetStateAction<number>>,
) {
	try {
		const res = await GetNoteCount(decodeURIComponent(folder));
		if (!res.success) {
			throw new Error("Failed to get note count");
		}
		setNoteCount(res.data);
	} catch (e) {
		if (e instanceof Error) {
			toast.error(e.message);
		}
	}
}
