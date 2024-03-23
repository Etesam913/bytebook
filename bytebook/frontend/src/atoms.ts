import { atom } from "jotai";

export const notesAtom = atom<string[] | null>([]);
export const foldersAtom = atom<string[] | null>([]);
export const darkModeAtom = atom<boolean>(false);
export const isToolbarDisabled = atom<boolean>(false);
