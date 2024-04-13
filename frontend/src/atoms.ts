import { atom } from "jotai";
import type { FolderDialogState } from "./types.ts";

const privateMostRecentNotesAtom = atom<string[]>(
	JSON.parse(localStorage.getItem("mostRecentNotes") ?? "[]") as string[],
);
export const mostRecentNotesAtom = atom(
	(get) => get(privateMostRecentNotesAtom),
	(_, set, payload: string[]) => {
		localStorage.setItem("mostRecentNotes", JSON.stringify(payload));
		set(privateMostRecentNotesAtom, payload);
	},
);
export const notesAtom = atom<string[] | null>([]);
export const foldersAtom = atom<string[] | null>([]);
export const alphabetizedFoldersAtom = atom((get) => {
	const folders = get(foldersAtom);
	return folders?.sort((a, b) => a.localeCompare(b));
});

export const darkModeAtom = atom<boolean>(false);

export const isToolbarDisabled = atom<boolean>(false);
export const isNoteMaximizedAtom = atom<boolean>(false);
export const isFolderDialogOpenAtom = atom<FolderDialogState>({
	isOpen: false,
	folderName: "",
});
