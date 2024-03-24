import type { SetStateAction } from "jotai";
import type { Dispatch } from "react";
import { navigate } from "wouter/use-browser-location";
import { GetFolders } from "../../bindings/main/FolderService";
import { GetNotes } from "../../bindings/main/NoteService";

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

export function updateNotes(
	folder: string,
	setNotes: Dispatch<SetStateAction<string[] | null>>,
) {
	GetNotes(folder)
		.then((res) => {
			if (res.success) {
				const notes = res.data as unknown as string[];
				setNotes(notes);
				navigate(`/${folder}${notes.at(0) ? `/${notes.at(0)}` : ""}`);
			}
		})
		.catch(() => {
			navigate("/");
			setNotes([]);
		});
}
