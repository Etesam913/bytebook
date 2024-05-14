import type { SetStateAction } from "jotai";
import type { Dispatch } from "react";
import { navigate } from "wouter/use-browser-location";
import { GetFolders } from "../../bindings/main/FolderService";
import { GetNotes } from "../../bindings/main/NoteService";

/** Initially fetches folders from filesystem */
export function updateFolders(
	setFolders: Dispatch<SetStateAction<string[] | null>>,
) {
	GetFolders()
		.then((res) => {
			if (res.success) {
				const folders = res.data as unknown as string[];
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
	GetNotes(folder)
		.then((res) => {
			if (res.success) {
				const notes = res.data as unknown as string[];
				setNotes(notes);
				// If the current is not defined, then navigate to the first note so that you are never at an undefined note
				if (!note) {
					navigate(`/${folder}${notes?.at(0) ? `/${notes.at(0)}` : "/"}`, {
						replace: true,
					});
				}
			} else {
				throw new Error("Failed in retrieving notes");
			}
		})
		.catch(() => {
			console.log(location.pathname)
			navigate("/not-found", {replace: true});
			setNotes(null);
		});
}
