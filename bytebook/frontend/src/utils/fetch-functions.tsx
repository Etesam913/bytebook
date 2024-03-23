import type { SetStateAction } from "jotai";
import type { Dispatch } from "react";
import { navigate } from "wouter/use-browser-location";
// import { GetFolderNames, GetNoteTitles } from "../../wailsjs/go/main/App";

export function updateFolders(
	setFolders: Dispatch<SetStateAction<string[] | null>>,
) {
	// GetFolderNames()
	// 	.then((folders) => setFolders(folders))
	// 	.catch((e) => {
	// 		console.error(e);
	// 		setFolders(null);
	// 	});
}

export function updateNotes(
	folder: string,
	setNotes: Dispatch<SetStateAction<string[] | null>>,
) {
	// GetNoteTitles(folder)
	// 	.then((v) => {
	// 		setNotes(v);
	// 		navigate(`/${folder}${v?.at(0) ? `/${v?.at(0)}` : ""}`);
	// 	})
	// 	.catch((e) => {
	// 		navigate("/");
	// 		setNotes([]);
	// 	});
}
