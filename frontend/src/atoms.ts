import { atom } from "jotai";
import { FolderDialogState } from "./types.ts";

export const notesAtom = atom<string[] | null>([]);
export const foldersAtom = atom<string[] | null>([]);
export const darkModeAtom = atom<boolean>(false);

export const isToolbarDisabled = atom<boolean>(false);
export const isNoteMaximizedAtom = atom<boolean>(false);
export const isFolderDialogOpenAtom = atom<FolderDialogState>({
	isOpen: false,
});
