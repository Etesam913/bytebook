import { Events } from "@wailsio/runtime";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { navigate } from "wouter/use-browser-location";
import {
	DeleteFolder,
	RevealFolderInFinder,
} from "../../bindings/github.com/etesam913/bytebook/folderservice";
import { WINDOW_ID } from "../App";
import { getDefaultButtonVariants } from "../animations";
import { MotionButton } from "../components/buttons";
import { DialogErrorText } from "../components/dialog";
import {
	FolderDialogChildren,
	onFolderDialogSubmit,
} from "../components/folder-sidebar";
import { FolderXMark } from "../icons/folder-xmark";
import type { DialogDataType } from "../types";
import { useWailsEvent } from "../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";
import { useCustomNavigate } from "../utils/routing";

/** This function is used to handle folder:context-menu:delete events */
export function useFolderOpenInNewWindow(
	selectionRange: Set<string>,
	setSelectionRange: Dispatch<SetStateAction<Set<string>>>,
) {
	useWailsEvent("folder:open-in-new-window", () => {
		for (const selectedFolder of selectionRange) {
			Events.Emit({
				name: "open-note-in-new-window-backend",
				data: { url: `/${selectedFolder}` },
			});
		}
		setSelectionRange(new Set());
	});
}

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

/** This function is used to handle folder:context-menu:delete events. It opens a dialog to confirm the deletion of a folder */
export function useFolderContextMenuDelete(
	folder: string | undefined,
	folders: string[] | null,
	setDialogData: Dispatch<SetStateAction<DialogDataType>>,
	setSelectionRange: Dispatch<SetStateAction<Set<string>>>,
) {
	useWailsEvent("folder:context-menu:delete", (body) => {
		const [deletedFolderName, windowId] = (body.data as string[])[0].split(",");
		setSelectionRange(new Set());
		if (windowId === WINDOW_ID) {
			setDialogData({
				isOpen: true,
				title: "Delete Folder",
				children: (errorText) => (
					<>
						<fieldset>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								Are you sure you want to{" "}
								<span className="text-red-500">
									delete "{deletedFolderName}"
								</span>{" "}
								and sent its notes to the trash bin?
							</p>
							<DialogErrorText errorText={errorText} />
						</fieldset>
						<MotionButton
							type="submit"
							{...getDefaultButtonVariants()}
							className="w-[calc(100%-1.5rem)] mx-auto justify-center"
						>
							<FolderXMark /> <span>Delete Folder</span>
						</MotionButton>
					</>
				),
				onSubmit: async (_, setErrorText) => {
					try {
						const res = await DeleteFolder(deletedFolderName);
						if (!res.success) throw new Error(res.message);
						// Navigate to the first folder that was not deleted
						if (folder && folder === deletedFolderName) {
							const firstFolderNotDeleted = folders?.find(
								(name) => name !== deletedFolderName,
							);
							if (firstFolderNotDeleted) navigate(`/${firstFolderNotDeleted}`);
							else navigate("/");
							// resetDialogState(setErrorText, setDialogData);
						}
						return true;
					} catch (e) {
						if (e instanceof Error) setErrorText(e.message);
						return false;
					}
				},
			});
		}
	});
}

/** This function is used to handle folder:context-menu:rename events. It opens a dialog to rename a folder */
export function useFolderContextMenuRename(
	setDialogData: Dispatch<SetStateAction<DialogDataType>>,
) {
	const { navigate } = useCustomNavigate();

	useWailsEvent("folder:context-menu:rename", (body) => {
		const [folderToBeRenamed, windowId] = (body.data as string[])[0].split(",");
		if (windowId === WINDOW_ID) {
			setDialogData({
				isOpen: true,
				title: "Rename Folder",
				children: (errorText) => (
					<FolderDialogChildren
						errorText={errorText}
						action="rename"
						folderToBeRenamed={folderToBeRenamed}
					/>
				),
				onSubmit: async (e, setErrorText) =>
					onFolderDialogSubmit(
						e,
						navigate,
						setErrorText,
						"rename",
						folderToBeRenamed,
					),
			});
		}
	});
}

/**
 * This function is used to handle folder:reveal-in-finder events
 * It opens the selected folders (only the first 5) in finder
 */
export async function useFolderContextMenuFindInFinder(
	selectionRange: Set<string>,
	setSelectionRange: Dispatch<SetStateAction<Set<string>>>,
) {
	useWailsEvent("folder:reveal-in-finder", async () => {
		const selectedFolders = [...selectionRange].slice(0, 5);
		try {
			const res = await Promise.all(
				selectedFolders.map(async (folder) => {
					const folderWithoutPrefix = folder.split(":")[1];
					return await RevealFolderInFinder(folderWithoutPrefix);
				}),
			);
			if (res.some((r) => !r.success)) {
				throw new Error("Failed to reveal folder in finder");
			}
		} catch (e) {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			}
		} finally {
			setSelectionRange(new Set([]));
		}
	});
}
