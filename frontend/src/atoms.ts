import { atom } from "jotai";
import type { MutableRefObject } from "react";
import type { DialogDataType, FolderDialogState } from "./types.ts";

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

export const attachmentsAtom = atom<string[]>([]);
export const notesAtom = atom<string[] | null>([]);
export const foldersAtom = atom<string[] | null>([]);
export const alphabetizedFoldersAtom = atom((get) => {
	const folders = get(foldersAtom);
	if (!folders) return folders;
	return folders.sort((a, b) => a.localeCompare(b));
});

export const darkModeAtom = atom<boolean>(false);

export const isToolbarDisabled = atom<boolean>(false);
export const isNoteMaximizedAtom = atom<boolean>(false);
export const isFolderDialogOpenAtom = atom<FolderDialogState>({
	isOpen: false,
	folderName: "",
});

export const noteContainerRefAtom =
	atom<MutableRefObject<HTMLElement | null> | null>(null);

export const dialogDataAtom = atom<DialogDataType>({
	isOpen: false,
	title: "",
	children: null,
	onSubmit: null,
});
