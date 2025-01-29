import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import { extractInfoFromNoteName } from "./string-formatting";

/**
 * Filters a selection Set to keep only items that start with the specified prefix.
 * @param selection - A Set of strings to filter
 * @param prefix - The prefix string to match against
 * @returns A new Set containing only the items that start with the prefix
 */
export function keepSelectionNotesWithPrefix(
	selection: Set<string>,
	prefix: "folder" | "note" | "tag",
) {
	const newSelection = new Set<string>();
	for (const item of selection) {
		if (item.startsWith(`${prefix}:`)) {
			newSelection.add(item);
		}
	}
	return newSelection;
}

/**
 * Takes a selection range like {note:Chapter 1?ext=md}, and returns a list of folder/noteName.extension strings
 * @param folder
 * @param selectionRange
 *
 */
export function getFolderAndNoteFromSelectionRange(
	folder: string,
	selectionRange: Set<string>,
) {
	return [...selectionRange].map((note) => {
		const noteWithoutWithoutPrefix = note.split(":")[1];
		const { noteNameWithoutExtension, queryParams } = extractInfoFromNoteName(
			noteWithoutWithoutPrefix,
		);
		return `${folder}/${noteNameWithoutExtension}.${queryParams.ext}`;
	});
}

/**
 * Handles key navigation for a button element within a list.
 * @param e - The keyboard event
 * @param liAncestor - The parent list item element
 */
export function handleKeyNavigation(e: KeyboardEvent) {
	const buttonElem = e.target as HTMLButtonElement;
	const liAncestor = buttonElem.parentElement?.parentElement;
	if (!liAncestor) return;
	if (e.key === "ArrowDown") {
		e.preventDefault();
		const nextLi = liAncestor.nextElementSibling;
		if (nextLi) {
			const nextButton = nextLi.querySelector("button") as HTMLButtonElement;
			if (nextButton) nextButton.focus();
		}
	} else if (e.key === "ArrowUp") {
		e.preventDefault();
		const prevLi = liAncestor.previousElementSibling;
		if (prevLi) {
			const prevButton = prevLi.querySelector("button") as HTMLButtonElement;
			if (prevButton) prevButton.focus();
		}
	}
}
/**
 * Handles escape key behavior in the editor, toggling maximized state and managing focus.
 * @param e - The keyboard event
 * @param isNoteMaximized - Boolean indicating if note is currently maximized
 * @param setIsNoteMaximized - State setter function for the maximized state
 */
export function handleEditorEscape(
	e: KeyboardEvent,
	isNoteMaximized: boolean,
	setIsNoteMaximized: Dispatch<SetStateAction<boolean>>,
) {
	if (e.key === "Escape") {
		if (isNoteMaximized) {
			setIsNoteMaximized(false);

			setTimeout(() => {
				const selectedNoteButton = document.getElementById(
					"selected-note-button",
				);
				if (!selectedNoteButton) return;
				selectedNoteButton.focus();
			}, 250);
		} else {
			const selectedNoteButton = document.getElementById(
				"selected-note-button",
			);
			if (!selectedNoteButton) return;
			selectedNoteButton.focus();
		}
	}
}

function isSelectedNoteOrFolderInViewport(
	noteOrFolder: string,
	visibleItems: string[],
) {
	return visibleItems.includes(noteOrFolder);
}

export function scrollVirtualizedListToSelectedNoteOrFolder(
	noteOrFolder: string,
	items: string[],
	visibleItems: string[],
	sidebarItemHeight: number,
) {
	if (isSelectedNoteOrFolderInViewport(noteOrFolder, visibleItems)) return -1;
	const indexOfSelectedItem = items.indexOf(noteOrFolder);
	if (indexOfSelectedItem === -1) return -1;
	return sidebarItemHeight * indexOfSelectedItem;
}
