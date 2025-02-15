import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { toast } from "sonner";
import {
	AddFolder,
	DeleteFolder,
	GetFolders,
	RenameFolder,
	RevealFolderInFinder,
} from "../../bindings/github.com/etesam913/bytebook/folderservice";
import { AddNoteToFolder } from "../../bindings/github.com/etesam913/bytebook/noteservice";
import { DEFAULT_SONNER_OPTIONS } from "../utils/general";
import { QueryError } from "../utils/query";
import { useCustomNavigate } from "../utils/routing";
import { validateName } from "../utils/string-formatting";
import { useWailsEvent } from "./events";

/**
 * Custom hook to fetch and manage folders.
 *
 * @param curFolder - The current folder name from the URL.
 * @returns An object containing the query data and alphabetized folders.
 */
export function useFolders(curFolder: string | undefined) {
	const { navigate } = useCustomNavigate();
	const queryData = useQuery({
		queryKey: ["folders"],
		queryFn: async () => {
			const res = await GetFolders();
			if (!res.success) {
				throw new QueryError(res.message);
			}
			// If the current folder does not exist anymore, then navigate to a safe url
			if (!res.data.some((folder) => folder === curFolder)) {
				if (res.data.length > 0) {
					const alphabetizedFolders = res.data.sort((a, b) =>
						a.localeCompare(b),
					);
					navigate(`/${encodeURIComponent(alphabetizedFolders[0])}`, {
						type: "folder",
					});
				} else {
					navigate("/");
				}
			}
			return res.data;
		},
	});

	return {
		...queryData,
		alphabetizedFolders:
			queryData.data?.sort((a, b) => a.localeCompare(b)) ?? null,
	};
}

/** This function is used to handle `notes-folder:create` events */
export function useFolderCreate() {
	const { navigate } = useCustomNavigate();
	const queryClient = useQueryClient();
	useWailsEvent("notes-folder:create", async (body) => {
		const data = (body.data as { folder: string }[][])[0];
		const newFolders = [...data.map(({ folder }) => folder)];
		await queryClient.invalidateQueries({ queryKey: ["folders"] });
		navigate(`/${encodeURIComponent(newFolders[newFolders.length - 1])}`, {
			type: "folder",
		});
	});
}

/** This function is used to handle `notes-folder:delete` events. This gets triggered when renaming a folder using the */
export function useFolderDelete() {
	const queryClient = useQueryClient();
	useWailsEvent("notes-folder:delete", () => {
		queryClient.invalidateQueries({ queryKey: ["folders"] });
	});
}

/**
 * Custom hook to handle folder creation and renaming through a dialog form submission.
 */
export function useFolderDialogSubmit() {
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
