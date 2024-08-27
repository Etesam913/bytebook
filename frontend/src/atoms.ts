import { atom } from "jotai";
import type { MutableRefObject } from "react";
import type {
	BackendQueryDataType,
	DialogDataType,
	SearchPanelDataType,
	SortStrings,
	UserData,
} from "./types.ts";

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

const userDataAtom = atom<UserData | null>(null);
export const userDataAtomWithLocalStorage = atom(
	(get) => get(userDataAtom),
	(_, set, newUserData: UserData) => {
		const accessToken = newUserData?.accessToken;

		localStorage.setItem("accessToken", accessToken ?? "null");
		set(userDataAtom, newUserData);
	},
);

export const notesAtom = atom<string[] | null>([]);
export const foldersAtom = atom<string[] | null>([]);

export const folderSortAtom = atom<SortStrings>("date-updated-desc");
export const noteSortAtom = atom<SortStrings>("date-updated-desc");

export const alphabetizedFoldersAtom = atom((get) => {
	const folders = get(foldersAtom);
	if (!folders) return folders;
	return folders.sort((a, b) => a.localeCompare(b));
});

export const selectionRangeAtom = atom<Set<string>>(new Set([]));

export const darkModeAtom = atom<boolean>(false);

export const isToolbarDisabled = atom<boolean>(false);
export const isNoteMaximizedAtom = atom<boolean>(false);

export const noteContainerRefAtom =
	atom<MutableRefObject<HTMLElement | null> | null>(null);

export const dialogDataAtom = atom<DialogDataType>({
	isOpen: false,
	title: "",
	children: null,
	onSubmit: null,
	dialogClassName: "",
});

export const backendQueryAtom = atom<BackendQueryDataType>({
	isLoading: false,
	message: "",
});

export const draggedElementAtom = atom<HTMLElement | null>(null);

export const draggableBlockElementAtom = atom<HTMLElement | null>(null);

export const searchPanelDataAtom = atom<SearchPanelDataType>({
	isOpen: false,
	query: "",
});
