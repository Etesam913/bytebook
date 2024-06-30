export function removeNotesFromSelection(selection: Set<string>) {
	const setWithoutNotes: Set<string> = new Set();
	// Remove any folder selections when selecting a note
	for (const item of selection) {
		if (!item.endsWith("?ext=md")) {
			setWithoutNotes.add(item);
		}
	}

	return setWithoutNotes;
}

export function removeFoldersFromSelection(selection: Set<string>) {
	const setWithoutFolders: Set<string> = new Set();
	// Remove any folder selections when selecting a note
	for (const item of selection) {
		if (item.endsWith("?ext=md")) {
			setWithoutFolders.add(item);
		}
	}
	return setWithoutFolders;
}
