import { AnimatePresence, type MotionValue, motion } from "framer-motion";
import { useAtom, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { foldersAtom, notesAtom } from "../../atoms";
import { MotionButton } from "../../components/buttons";
import { NotesEditor } from "../../components/editor";
import { FolderSidebarDialog } from "../../components/folder-sidebar/sidebar-dialog";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { Compose } from "../../icons/compose";
import { Folder } from "../../icons/folder";
import { Note } from "../../icons/page";
import { Pen } from "../../icons/pen";
import { Trash } from "../../icons/trash";
import { updateNotes } from "../../utils/fetch-functions";
import { cn } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { NotesSidebarDialog } from "./sidebar-dialog";
import { DeleteFolder } from "../../../bindings/main/FolderService";

export function NotesSidebar({
	params,
	width,
	leftWidth,
}: {
	params: { folder: string; note?: string };
	width: MotionValue<number>;
	leftWidth: MotionValue<number>;
}) {
	const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
	const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
	const [notes, setNotes] = useAtom(notesAtom);
	const setFolders = useSetAtom(foldersAtom);

	const { folder, note } = params;

	useEffect(() => {
		updateNotes(folder, setNotes);
	}, [folder, setNotes]);

	const noteElements = notes?.map((noteName) => (
		<li key={noteName}>
			<div className="flex items-center gap-2 overflow-hidden pr-1">
				<Link
					className={cn(
						"flex flex-1 gap-2 items-center px-3 py-[0.45rem] mb-[0.15rem] rounded-md overflow-auto",
						noteName === note && "bg-zinc-100 dark:bg-zinc-700",
					)}
					to={`/${encodeURI(folder)}/${encodeURI(noteName)}`}
				>
					<Note className="min-w-[1.25rem]" />{" "}
					<p className="whitespace-nowrap text-ellipsis overflow-hidden">
						{noteName}
					</p>
				</Link>
				<motion.button
					onClick={() =>
						DeleteFolder(`${folder}/${noteName}`).then((res) => {
							if (res.success) {
								const remainingNotes = notes?.filter((v) => v !== noteName);
								navigate(
									`/${folder}${
										remainingNotes.length > 0 ? `/${remainingNotes[0]}` : ""
									}`,
								);
								setNotes(remainingNotes);
							}
						})
					}
					{...getDefaultButtonVariants(false, 1.15, 0.95, 1.15)}
					type="button"
					className="min-w-[20px] p-1 rounded-[0.3rem] flex item-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors duration-300"
				>
					<Trash />
				</motion.button>
			</div>
		</li>
	));

	return (
		<>
			<AnimatePresence>
				{isNoteDialogOpen && (
					<NotesSidebarDialog
						isNoteDialogOpen={isNoteDialogOpen}
						setIsNoteDialogOpen={setIsNoteDialogOpen}
						folderName={folder}
						setNotes={setNotes}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{isFolderDialogOpen && (
					<FolderSidebarDialog
						action="rename"
						isFolderDialogOpen={isFolderDialogOpen}
						setIsFolderDialogOpen={setIsFolderDialogOpen}
						setFolders={setFolders}
						oldFolderName={folder}
					/>
				)}
			</AnimatePresence>

			<motion.aside
				style={{ width }}
				className="pt-[0.75rem] text-md h-screen flex flex-col gap-2 overflow-y-auto"
			>
				<div className="px-[10px] pt-[3px] flex flex-col gap-4 h-full overflow-y-auto">
					<section className="flex gap-2 items-center">
						<Folder className="min-w-[1.25rem]" />{" "}
						<p className="whitespace-nowrap text-ellipsis overflow-hidden">
							{folder}
						</p>
						<motion.button
							type="button"
							data-testid="rename_folder_button"
							{...getDefaultButtonVariants(false, 1.15, 0.95, 1.15)}
							className="min-w-[1.5rem] p-[2.5px] rounded-[0.5rem] flex item-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors duration-300"
							onClick={() => setIsFolderDialogOpen(true)}
						>
							<Pen className="w-full" />
						</motion.button>
					</section>
					<MotionButton
						{...getDefaultButtonVariants()}
						onClick={() => setIsNoteDialogOpen(true)}
						className="w-full bg-transparent flex justify-between align-center"
					>
						Create Note <Compose />
					</MotionButton>
					<section className="flex flex-col flex-1 gap-3 overflow-y-auto">
						<p>Your Notes</p>
						<ul className="overflow-y-auto">
							{noteElements && noteElements.length > 0 ? (
								noteElements
							) : (
								<li className="text-center text-zinc-500 dark:text-zinc-300  text-xs">
									Create a note with the "Create Note" button above
								</li>
							)}
						</ul>
					</section>
				</div>
			</motion.aside>
			<Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />

			{note && <NotesEditor params={{ folder, note }} />}
		</>
	);
}
