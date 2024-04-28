import {
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useState,
} from "react";
import {
	AddFolder,
	DeleteFolder,
	RenameFolder,
} from "../../../bindings/main/FolderService";
import { FolderPen } from "../../icons/folder-pen.tsx";
import { FolderPlus } from "../../icons/folder-plus";
import { FolderXMark } from "../../icons/folder-xmark.tsx";
import type { FolderDialogAction, FolderDialogState } from "../../types.ts";
import { fileNameRegex } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { MotionButton } from "../buttons";
import { Dialog, ErrorText } from "../dialog";

const actionNameMap: Record<
	FolderDialogAction,
	{ title: string; icon: ReactNode }
> = {
	create: { title: "Create Folder", icon: <FolderPlus /> },
	rename: { title: "Rename Folder", icon: <FolderPen /> },
	delete: { title: "Delete Folder", icon: <FolderXMark /> },
};

export function FolderSidebarDialog({
	isFolderDialogOpen,
	setIsFolderDialogOpen,
}: {
	isFolderDialogOpen: FolderDialogState;
	setIsFolderDialogOpen: Dispatch<SetStateAction<FolderDialogState>>;
	folders: string[];
}) {
	const [errorText, setErrorText] = useState("");
	const { action, isOpen } = isFolderDialogOpen;
	return (
		<Dialog
			handleSubmit={(e) => {
				const formData = new FormData(e.target as HTMLFormElement);
				const folderNameValue = formData.get("folder-name");
				if (folderNameValue && typeof folderNameValue === "string") {
					const folderName = folderNameValue.trim() satisfies string;
					if (!fileNameRegex.test(folderName)) {
						setErrorText(
							"Invalid folder name. Folder names can only contain letters, numbers, spaces, hyphens, and underscores.",
						);
						return;
					}

					if (action === "create") {
						AddFolder(folderName)
							.then((res) => {
								if (res.success) {
									setIsFolderDialogOpen({ isOpen: false, folderName });
									setErrorText("");
								} else {
									setErrorText(res.message);
								}
							})
							.catch((e) => {
								console.error(e);
								setErrorText(e.message);
							});
					} else if (action === "rename") {
						RenameFolder(isFolderDialogOpen.folderName, folderName)
							.then((res) => {
								if (res.success) {
									setIsFolderDialogOpen({ isOpen: false, folderName: "" });
									setErrorText("");
								}
							})
							.catch((e) => {
								console.error(e);
								if (e.message) {
									setErrorText(e.message);
								}
							});
					}
				} else if (action === "delete") {
					DeleteFolder(`${isFolderDialogOpen.folderName}`).then((res) => {
						if (res.success) {
							setIsFolderDialogOpen({ isOpen: false, folderName: "" });
						}
					});
				}
			}}
			title={actionNameMap[action ?? "create"].title}
			isOpen={isOpen}
			setIsOpen={(isOpen) => {
				setIsFolderDialogOpen({ isOpen: isOpen, folderName: "" });
			}}
		>
			<div className="flex flex-col">
				{action !== "delete" ? (
					<>
						<label className="cursor-pointer pb-2" htmlFor="folder-name">
							New Folder Name
						</label>
						<input
							data-testid="folder_name"
							name="folder-name"
							placeholder="My To Do's"
							className="w-full rounded-sm border-[1px] border-zinc-300 px-2 py-1 transition-colors focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:focus:border-zinc-500"
							id="folder-name"
							type="text"
						/>
					</>
				) : (
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
						Are you sure you want to{" "}
						<span className="text-red-500">delete</span> "
						{isFolderDialogOpen.folderName}" and sent its notes to the trash
						bin?
					</p>
				)}

				<section className="mt-4 flex w-full flex-col gap-1 px-[0.5rem] ">
					<ErrorText errorText={errorText} />
					<MotionButton
						type="submit"
						{...getDefaultButtonVariants()}
						className="flex w-full flex-wrap items-center justify-center gap-2 text-center "
					>
						{actionNameMap[action ?? "create"].title}{" "}
						{actionNameMap[action ?? "create"].icon}
					</MotionButton>
				</section>
			</div>
		</Dialog>
	);
}
