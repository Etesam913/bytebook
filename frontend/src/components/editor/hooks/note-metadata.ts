import { useAtom } from "jotai";
import { useEffect } from "react";
import { ValidateMostRecentNotes } from "../../../../bindings/github.com/etesam913/bytebook/noteservice";
import { mostRecentNotesAtom } from "../../../atoms";

/** Updates the most recent notes queue */
export function useMostRecentNotes(
	folder: string,
	note: string,
	fileExtension: string,
) {
	const [mostRecentNotes, setMostRecentNotes] = useAtom(mostRecentNotesAtom);

	useEffect(() => {
		if (folder === "trash") return;
		const currentPath = `${folder}/${note}?ext=${fileExtension}`;
		const tempMostRecentNotes = mostRecentNotes.filter(
			(path) => path !== currentPath,
		);
		if (tempMostRecentNotes.length > 4) {
			tempMostRecentNotes.pop();
		}
		tempMostRecentNotes.unshift(currentPath);
		const mostRecentNotesForBackend = tempMostRecentNotes.map((path) => {
			const lastIndex = path.lastIndexOf("?ext=");
			const folderAndNote = path.substring(0, lastIndex);
			const ext = path.substring(lastIndex + 5);

			return `${folderAndNote}.${ext}`;
		});

		ValidateMostRecentNotes(mostRecentNotesForBackend).then((res) => {
			setMostRecentNotes(res ?? []);
		});
	}, [folder, note, setMostRecentNotes]);
}
