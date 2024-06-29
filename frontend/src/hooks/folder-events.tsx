import { Events } from "@wailsio/runtime";
import type { Dispatch, SetStateAction } from "react";
import { navigate } from "wouter/use-browser-location";
import { DeleteFolder } from "../../bindings/github.com/etesam913/bytebook/folderservice";
import { WINDOW_ID } from "../App";
import { getDefaultButtonVariants } from "../animations";
import { MotionButton } from "../components/buttons";
import { DialogErrorText, resetDialogState } from "../components/dialog";
import {
	FolderDialogChildren,
	onFolderDialogSubmit,
} from "../components/folder-sidebar";
import { FolderXMark } from "../icons/folder-xmark";
import type { DialogDataType } from "../types";
import { useWailsEvent } from "../utils/hooks";

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

export function useFolderCreate(
	setFolders: Dispatch<SetStateAction<string[] | null>>,
) {
	useWailsEvent("folder:create", (body) => {
		const data = body.data as { folder: string };
		setFolders((prev) => (prev ? [...prev, data.folder] : [data.folder]));
	});
}

/** This function is used to handle folder:delete events */
export function useFolderDelete(
	setFolders: Dispatch<SetStateAction<string[] | null>>,
) {
	useWailsEvent("folder:delete", (body) => {
		const data = body.data as { folder: string };
		setFolders((prev) => {
			if (prev) {
				const newFolders = prev.filter((folder) => folder !== data.folder);
				if (newFolders.length > 0) {
					navigate(`/${encodeURIComponent(newFolders[0])}`);
				} else {
					navigate("/");
				}
				return newFolders;
			}
			navigate("/");
			return [];
		});
	});
}

/** This function is used to handle folder:rename events */
export function useFolderRename(
	setFolders: Dispatch<SetStateAction<string[] | null>>,
) {
	useWailsEvent("folder:rename", (body) => {
		const data = body.data as { folder: string };
		setFolders((prev) => {
			if (prev) {
				const newFolders = prev.filter((folder) => folder !== data.folder);
				return newFolders;
			}
			return [];
		});
	});
}

/** This function is used to handle folder:context-menu:delete events. It opens a dialog to confirm the deletion of a folder */
export function useFolderContextMenuDelete(
	setDialogData: Dispatch<SetStateAction<DialogDataType>>,
) {
	useWailsEvent("folder:context-menu:delete", (body) => {
		const [folderName, windowId] = (body.data as string).split(",");

		if (windowId === WINDOW_ID) {
			setDialogData({
				isOpen: true,
				title: "Delete Folder",
				children: (errorText) => (
					<>
						<fieldset>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								Are you sure you want to{" "}
								<span className="text-red-500">delete "{folderName}"</span> and
								sent its notes to the trash bin?
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
						const res = await DeleteFolder(folderName);
						if (!res.success) throw new Error(res.message);
						resetDialogState(setErrorText, setDialogData);
					} catch (e) {
						if (e instanceof Error) setErrorText(e.message);
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
	useWailsEvent("folder:context-menu:rename", (event) => {
		const [folderToBeRenamed, windowId] = (event.data as string).split(",");
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
				onSubmit: (e, setErrorText) => {
					onFolderDialogSubmit(
						e,
						setErrorText,
						setDialogData,
						"rename",
						folderToBeRenamed,
					);
				},
			});
		}
	});
}
