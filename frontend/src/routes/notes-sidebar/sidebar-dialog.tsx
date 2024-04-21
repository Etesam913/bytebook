import { Events } from "@wailsio/runtime";
import { type Dispatch, type SetStateAction, useState } from "react";
import { navigate } from "wouter/use-browser-location";
import { AddNoteToFolder } from "../../../bindings/main/NoteService";
import { WINDOW_ID } from "../../App";
import { MotionButton } from "../../components/buttons";
import { Dialog, ErrorText } from "../../components/dialog";
import { Compose } from "../../icons/compose";
import { fileNameRegex } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";

export function NotesSidebarDialog({
	isNoteDialogOpen,
	setIsNoteDialogOpen,
	folderName,
	notes,
}: {
	isNoteDialogOpen: boolean;
	setIsNoteDialogOpen: Dispatch<SetStateAction<boolean>>;
	folderName: string;
	notes: string[] | null;
}) {
	const [errorText, setErrorText] = useState("");

	return (
		<Dialog
			handleSubmit={(e) => {
				const formData = new FormData(e.target as HTMLFormElement);
				const noteNameForm = formData.get("note-name");
				if (noteNameForm && typeof noteNameForm === "string") {
					const noteName = noteNameForm.trim() satisfies string;
					if (!fileNameRegex.test(noteName)) {
						setErrorText(
							"Invalid note name. Note names can only contain letters, numbers, spaces, hyphens, and underscores.",
						);
						return;
					}

					AddNoteToFolder(folderName, noteName)
						.then((res) => {
							if (res.success) {
								setIsNoteDialogOpen(false);
								setErrorText("");
								navigate(`/${folderName}/${noteName}`);
								Events.Emit({
									name: "notes:changed",
									data: {
										windowId: WINDOW_ID,
										notes: !notes ? [noteName] : [...notes, noteName],
									},
								});
							} else {
								setErrorText(res.message);
							}
						})
						.catch((e) => {
							console.error(e);
							setErrorText(e.message);
						});
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
					maxLength={50}
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
