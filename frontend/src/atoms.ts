import { atom } from "jotai";

export const notesAtom = atom<string[] | null>([]);
export const foldersAtom = atom<string[] | null>([]);
