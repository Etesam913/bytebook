import { Dispatch, SetStateAction, useState } from "react";
import { Dialog, ErrorText } from "../../components/dialog";
import { getDefaultButtonVariants } from "../../variants";
import { MotionButton } from "../../components/button";
import { Compose } from "../../icons/compose";
import { AddNoteToFolder } from "../../../wailsjs/go/main/App";

export function NotesSidebarDialog({
	isNoteDialogOpen,
	setIsNoteDialogOpen,
	folderName,
}: {
	isNoteDialogOpen: boolean;
	setIsNoteDialogOpen: Dispatch<SetStateAction<boolean>>;
	folderName: string;
}) {
	const [errorText, setErrorText] = useState("");

	return (
		<Dialog
			handleSubmit={(e) => {
				const formData = new FormData(e.target as HTMLFormElement);
				let noteName = formData.get("note-name");
				if (typeof noteName === "string") {
					noteName = noteName.trim();
					if (noteName.includes("/")) {
						setErrorText("Note name cannot contain '/'");
						return;
					}
					if (noteName === "") {
						setErrorText("Note name cannot be empty");
						return;
					}
					setErrorText("");
					AddNoteToFolder(folderName, noteName)
						.then((v) => {
							if (v.Success) {
								setIsNoteDialogOpen(false);
								setErrorText("");
							} else {
								setErrorText(v.Message);
							}
						})
						.catch((e) => setErrorText(e.message));
				}
			}}
			title="Create Note"
			isOpen={isNoteDialogOpen}
			setIsOpen={setIsNoteDialogOpen}
		>
			<div className="flex flex-col">
				<label className="pb-2 cursor-pointer" htmlFor="note-name">
					Note Name
				</label>
				<input
					name="note-name"
					placeholder="My First Note"
					className="py-1 px-2 rounded-sm border-[1px] border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-colors w-full"
					id="note-name"
					type="text"
				/>
				<section className="w-full px-[0.5rem] mt-4 flex flex-col gap-1 ">
					<ErrorText errorText={errorText} />
					<MotionButton
						type="submit"
						{...getDefaultButtonVariants()}
						className="w-full text-center flex items-center gap-2 justify-center flex-wrap "
					>
						Add Note <Compose />
					</MotionButton>
				</section>
			</div>
		</Dialog>
	);
}
