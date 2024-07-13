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
