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
					navigate(
						`/${folder}${
							notes?.at(0) ? `/${encodeURIComponent(notes[0])}` : "/"
						}`,
						{
							replace: true,
						},
					);
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
