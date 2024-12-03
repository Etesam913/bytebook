import { extractInfoFromNoteName } from "./string-formatting";

/**
 * Takes a selection set and returns a new set containing only folder items,
 * filtering out any note items from the selection
 */
export function removeNotesFromSelection(selection: Set<string>) {
	const setWithoutNotes: Set<string> = new Set();
	// Remove any folder selections when selecting a note
	for (const item of selection) {
		if (item.startsWith("folder:")) {
			setWithoutNotes.add(item);
		}
	}

	return setWithoutNotes;
}

/**
 * Takes a selection set and returns a new set containing only note items,
 * filtering out any folder items from the selection
 */
export function removeFoldersFromSelection(selection: Set<string>) {
	const setWithoutFolders: Set<string> = new Set();
	// Remove any folder selections when selecting a note
	for (const item of selection) {
		if (item.startsWith("note:")) {
			setWithoutFolders.add(item);
		}
	}
	return setWithoutFolders;
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
