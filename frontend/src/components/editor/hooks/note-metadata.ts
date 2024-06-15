import { useAtom } from "jotai";
import { useEffect } from "react";
import { ValidateMostRecentNotes } from "../../../../bindings/github.com/etesam913/bytebook/noteservice";
import { mostRecentNotesAtom } from "../../../atoms";

/** Updates the most recent notes queue */
export function useMostRecentNotes(folder: string, note: string) {
	const [mostRecentNotes, setMostRecentNotes] = useAtom(mostRecentNotesAtom);

	useEffect(() => {
		const currentPath = `${folder}/${note}`;
		const tempMostRecentNotes = mostRecentNotes.filter(
			(path) => path !== currentPath,
		);
		if (tempMostRecentNotes.length > 4) {
			tempMostRecentNotes.pop();
		}
		tempMostRecentNotes.unshift(currentPath);
		ValidateMostRecentNotes(tempMostRecentNotes).then((res) => {
			setMostRecentNotes(res ?? []);
		});
	}, [folder, note, setMostRecentNotes]);
}
