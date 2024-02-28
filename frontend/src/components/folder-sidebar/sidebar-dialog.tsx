import { type Dispatch, type SetStateAction, useState } from "react";
import { navigate } from "wouter/use-browser-location";
import { AddFolderUsingName } from "../../../wailsjs/go/main/App";
import { FolderPlus } from "../../icons/folder-plus";
import { fileNameRegex } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { MotionButton } from "../buttons";
import { Dialog, ErrorText } from "../dialog";

export function FolderSidebarDialog({
	isFolderDialogOpen,
	setIsFolderDialogOpen,
	setFolders,
}: {
	isFolderDialogOpen: boolean;
	setIsFolderDialogOpen: Dispatch<SetStateAction<boolean>>;
	setFolders: Dispatch<SetStateAction<string[] | null>>;
}) {
	const [errorText, setErrorText] = useState("");

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

					AddFolderUsingName(folderName)
						.then((v) => {
							if (v.Success) {
								setIsFolderDialogOpen(false);
								setErrorText("");
								setFolders((prev) =>
									prev ? [...prev, folderName] : [folderName],
								);
								navigate(`/${folderName}`);
							} else {
								setErrorText(v.Message);
							}
						})
						.catch((e) => {
							console.error(e);
							setErrorText(e.message);
						});
				}
			}}
			title="Create Folder"
			isOpen={isFolderDialogOpen}
			setIsOpen={setIsFolderDialogOpen}
		>
			<div className="flex flex-col">
				<label className="pb-2 cursor-pointer" htmlFor="folder-name">
					Folder Name
				</label>
				<input
					name="folder-name"
					placeholder="My To Do's"
					className="py-1 px-2 rounded-sm border-[1px] border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-colors w-full"
					id="folder-name"
					type="text"
				/>
				<section className="w-full px-[0.5rem] mt-4 flex flex-col gap-1 ">
					<ErrorText errorText={errorText} />
					<MotionButton
						type="submit"
						{...getDefaultButtonVariants()}
						className="w-full text-center flex items-center gap-2 justify-center flex-wrap "
					>
						Add Folder <FolderPlus />
					</MotionButton>
				</section>
			</div>
		</Dialog>
	);
}
