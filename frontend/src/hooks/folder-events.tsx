import type { Dispatch, FormEvent, SetStateAction } from "react";

import { useMutation } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { navigate } from "wouter/use-browser-location";
import {
	AddFolder,
	DeleteFolder,
	RenameFolder,
	RevealFolderInFinder,
} from "../../bindings/github.com/etesam913/bytebook/folderservice";
import { AddNoteToFolder } from "../../bindings/github.com/etesam913/bytebook/noteservice";
import { foldersAtom } from "../atoms";
import { useWailsEvent } from "../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";
import { useCustomNavigate } from "../utils/routing";
import { validateName } from "../utils/string-formatting";

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

/**
 * Custom hook to handle folder creation and renaming through a dialog form submission.
 */
export function useFolderDialogSubmit() {
	const { navigate } = useCustomNavigate();
	const folders = useAtomValue(foldersAtom);
	return useMutation({
		// The main function that handles folder creation or renaming
		mutationFn: async ({
			e,
			folderFromSidebar,
			action,
		}: {
			action: "create" | "rename" | "delete";
			e: FormEvent<HTMLFormElement>;
			folderFromSidebar?: string;
			setErrorText: Dispatch<SetStateAction<string>>;
		}): Promise<boolean> => {
			// Extract form data and validate the folder name
			const formData = new FormData(e.target as HTMLFormElement);
			const newFolderName = formData.get("folder-name");
			const { isValid, errorMessage } = validateName(newFolderName, "folder");
			if (!isValid && action !== "delete") throw new Error(errorMessage);
			if (!newFolderName && action !== "delete") return false;

			const newFolderNameString = newFolderName?.toString()?.trim() ?? "";

			// Handle folder creation
			if (action === "create") {
				const res = await AddFolder(newFolderNameString);
				if (!res.success) throw new Error(res.message);

				// Add an untitled note to the newly created folder
				const addNoteRes = await AddNoteToFolder(
					newFolderNameString,
					"Untitled",
				);
				if (addNoteRes.success) {
					return true;
				}
				throw new Error(addNoteRes.message);
			}

			// Handle folder renaming
			if (action === "rename") {
				if (!folderFromSidebar) throw new Error("Something went wrong");
				const res = await RenameFolder(folderFromSidebar, newFolderNameString);
				if (!res.success) throw new Error(res.message);
				return true;
			}

			// Handle folder deletion
			if (action === "delete") {
				if (!folderFromSidebar) throw new Error("Something went wrong");
				const res = await DeleteFolder(folderFromSidebar);
				if (!res.success) throw new Error(res.message);

				// Navigate to the first folder that was not deleted
				const firstFolderNotDeleted = folders?.find(
					(name) => name !== folderFromSidebar,
				);
				if (firstFolderNotDeleted) navigate(`/${firstFolderNotDeleted}`);
				else navigate("/");
				console.log("should delete");
				return true;
			}
			return false;
		},
		// Handle errors that occur during the mutation
		onError: (
			error,
			variables: {
				action: "create" | "rename" | "delete";
				e: FormEvent<HTMLFormElement>;
				folderFromSidebar?: string;
				setErrorText: Dispatch<SetStateAction<string>>;
			},
		) => {
			if (error instanceof Error) variables.setErrorText(error.message);
			else
				variables.setErrorText(
					"An unknown error occurred. Please try again later.",
				);
			return false;
		},
	});
}
/** Custom hook to handle revealing folders in Finder */
export function useFolderRevealInFinderMutation() {
	return useMutation({
		// The main function that handles revealing folders in Finder
		mutationFn: async ({ selectionRange }: { selectionRange: Set<string> }) => {
			// Limit the number of folders to reveal to 5
			const selectedFolders = [...selectionRange].slice(0, 5);

			// Reveal each selected folder in Finder
			const res = await Promise.all(
				selectedFolders.map(async (folder) => {
					const folderWithoutPrefix = folder.split(":")[1];
					return await RevealFolderInFinder(folderWithoutPrefix);
				}),
			);

			// Check if any folder failed to reveal
			if (res.some((r) => !r.success)) {
				throw new Error("Failed to reveal folder in finder");
			}
		},
		// Handle errors that occur during the mutation
		onError: (e) => {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			}
		},
	});
}
