import { extractInfoFromNoteName } from "./string-formatting";

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
	console.log(selectionRange);
	return [...selectionRange].map((note) => {
		const noteWithoutWithoutPrefix = note.split(":")[1];
		const { noteNameWithoutExtension, queryParams } = extractInfoFromNoteName(
			noteWithoutWithoutPrefix,
		);
		return `${folder}/${noteNameWithoutExtension}.${queryParams.ext}`;
	});
}
