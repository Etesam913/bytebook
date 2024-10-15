import type { Dispatch, SetStateAction } from "react";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { navigate } from "wouter/use-browser-location";
import { RevealFolderInFinder } from "../../bindings/github.com/etesam913/bytebook/folderservice";
import { useWailsEvent } from "../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";

/** This function is used to handle `folder:create` events */
export function useFolderCreate(
	setFolders: Dispatch<SetStateAction<string[] | null>>,
) {
	useWailsEvent("folder:create", (body) => {
		const data = (body.data as { folder: string }[][])[0];

		setFolders((prev) => {
			if (!prev) return data.map(({ folder }) => folder);
			const allFolders = [...prev, ...data.map(({ folder }) => folder)];
			// navigate to the last added folder

			// TODO: Get first note and navigate to it
			navigate(`/${encodeURIComponent(allFolders[allFolders.length - 1])}`);

			return allFolders;
		});
	});
}

/** This function is used to handle `folder:delete` events. This gets triggered when renaming a folder using the */
export function useFolderDelete(
	setFolders: Dispatch<SetStateAction<string[] | null>>,
) {
	useWailsEvent("folder:delete", (body) => {
		const data = (body.data as { folder: string }[][])[0];
		const deletedFolders = new Set(data.map(({ folder }) => folder));

		setFolders((prev) => {
			if (!prev) return prev;
			const remainingFolders = prev.filter(
				(folder) => !deletedFolders.has(folder),
			);
			return remainingFolders;
		});
	});
}

/** This function is used to handle folder:rename events.  This gets triggered when deleting a folder in finder */
export function useFolderRename(
	folder: string | undefined,
	setFolders: Dispatch<SetStateAction<string[] | null>>,
) {
	useWailsEvent("folder:rename", (body) => {
		const data = (body.data as { folder: string }[][])[0];
		const renamedFolders = new Set(data.map(({ folder }) => folder));

		setFolders((prev) => {
			if (prev) {
				// Gets all the folders that were not renamed. The create event will handle the new names
				const newFolders = prev.filter((folder) => !renamedFolders.has(folder));
				// the current folder was renamed

				if (folder && renamedFolders.has(folder) && newFolders.length > 0) {
					navigate(`/${encodeURIComponent(newFolders[0])}`);
				} else {
					navigate("/");
				}

				return newFolders;
			}
			return [];
		});
	});
}

export function useFolderRevealInFinderMutation() {
	return useMutation({
		mutationFn: async ({ selectionRange }: { selectionRange: Set<string> }) => {
			const selectedFolders = [...selectionRange].slice(0, 5);

			const res = await Promise.all(
				selectedFolders.map(async (folder) => {
					const folderWithoutPrefix = folder.split(":")[1];
					return await RevealFolderInFinder(folderWithoutPrefix);
				}),
			);
			if (res.some((r) => !r.success)) {
				throw new Error("Failed to reveal folder in finder");
			}
		},
		onError: (e) => {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			}
		},
	});
}
