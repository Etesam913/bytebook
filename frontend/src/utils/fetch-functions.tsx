import type { SetStateAction } from "jotai";
import type { Dispatch } from "react";
import { navigate } from "wouter/use-browser-location";
import { GetFolders } from "../../bindings/github.com/etesam913/bytebook/folderservice";
import { GetNotes } from "../../bindings/github.com/etesam913/bytebook/noteservice";

/** Initially fetches folders from filesystem */
export function updateFolders(
	setFolders: Dispatch<SetStateAction<string[] | null>>,
) {
	GetFolders()
		.then((res) => {
			if (res.success) {
				const folders = res.data;
				setFolders(folders);
			} else {
				setFolders(null);
			}
		})
		.catch((e) => {
			console.error(e);
			setFolders(null);
		});
}

/** Initially fetches notes for a folder using the filesystem */
export function updateNotes(
	folder: string,
	note: string | undefined,
	setNotes: Dispatch<SetStateAction<string[] | null>>,
) {
	GetNotes(decodeURIComponent(folder))
		.then((res) => {
			if (res.success) {
				const notes = res.data;
				setNotes(notes);
				// If the current is not defined, then navigate to the first note so that you are never at an undefined note
				if (!note) {
					const hasANote = notes.length > 0;
					if (!hasANote) {
						navigate("/", { replace: true });
						return;
					}

					let lastDotIndex = -1;
					for (let i = notes[0].length - 1; i > -1; i--) {
						if (notes[0][i] === ".") {
							lastDotIndex = i;
							break;
						}
					}

					const [name, extension] = [
						notes[0].slice(0, lastDotIndex),
						notes[0].slice(lastDotIndex + 1),
					];
					navigate(`/${folder}/${encodeURIComponent(name)}?ext=${extension}`, {
						replace: true,
					});
				}
			} else {
				throw new Error("Failed in retrieving notes");
			}
		})
		.catch(() => {
			navigate("/not-found", { replace: true });
			setNotes(null);
		});
}
