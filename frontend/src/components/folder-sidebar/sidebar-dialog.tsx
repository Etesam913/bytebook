import { type Dispatch, ReactNode, type SetStateAction, useState } from "react";
import { navigate } from "wouter/use-browser-location";
import {
	AddFolder,
	DeleteFolder,
	RenameFolder,
} from "../../../bindings/main/FolderService";
import { FolderPen } from "../../icons/folder-pen.tsx";
import { FolderPlus } from "../../icons/folder-plus";
import { FolderXMark } from "../../icons/folder-xmark.tsx";
import { FolderDialogAction, FolderDialogState } from "../../types.ts";
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
	setFolders,
	folders,
}: {
	isFolderDialogOpen: FolderDialogState;
	setIsFolderDialogOpen: Dispatch<SetStateAction<FolderDialogState>>;
	setFolders: Dispatch<SetStateAction<string[] | null>>;
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
									setFolders((prev) =>
										prev ? [...prev, folderName] : [folderName],
									);
									navigate(`/${folderName}`);
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
									setFolders((prev) => {
										return prev
											? prev.map((v: string) =>
													v === isFolderDialogOpen.folderName ? folderName : v,
												// eslint-disable-next-line no-mixed-spaces-and-tabs
											  )
											: [folderName];
									});
									navigate(`/${folderName}`);
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
							const newFolders = folders.filter(
								(v) => v !== isFolderDialogOpen.folderName,
							);
							navigate(folders.length > 1 ? `/${newFolders[0]}` : "/");
							setFolders(newFolders);
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
						<label className="pb-2 cursor-pointer" htmlFor="folder-name">
							New Folder Name
						</label>
						<input
							data-testid="folder_name"
							name="folder-name"
							placeholder="My To Do's"
							className="py-1 px-2 rounded-sm border-[1px] border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-colors w-full"
							id="folder-name"
							type="text"
						/>
					</>
				) : (
					<p className="text-zinc-500 dark:text-zinc-400 text-sm">
						Are you sure you want to{" "}
						<span className="text-red-500">delete</span> "
						{isFolderDialogOpen.folderName}" and sent its notes to the trash
						bin?
					</p>
				)}

				<section className="w-full px-[0.5rem] mt-4 flex flex-col gap-1 ">
					<ErrorText errorText={errorText} />
					<MotionButton
						type="submit"
						{...getDefaultButtonVariants()}
						className="w-full text-center flex items-center gap-2 justify-center flex-wrap "
					>
						{actionNameMap[action ?? "create"].title}{" "}
						{actionNameMap[action ?? "create"].icon}
					</MotionButton>
				</section>
			</div>
		</Dialog>
	);
}
