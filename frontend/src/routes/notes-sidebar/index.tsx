import {
	type MotionValue,
	useMotionValueEvent,
	AnimatePresence,
	motion,
} from "framer-motion";
import { type CSSProperties, useState, useEffect } from "react";
import { cn } from "../../utils/tailwind";
import { MotionButton } from "../../components/button";
import { getDefaultButtonVariants } from "../../variants";
import { Folder } from "../../icons/folder";
import { NotesSidebarDialog } from "./sidebar-dialog";
import { Compose } from "../../icons/compose";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { GetNoteTitles } from "../../../wailsjs/go/main/App";
import { Note } from "../../icons/page";

export function NotesSidebar({
	params,
	notesSidebarWidth,
	folderSidebarWidth,
}: {
	params: { folder: string };
	notesSidebarWidth: MotionValue<number>;
	folderSidebarWidth: MotionValue<number>;
}) {
	const [leftWidth, setLeftWidth] = useState(160);
	const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
	const [notes, setNotes] = useState<string[] | null>([]);
	const { folder } = params;

	useEffect(() => {
		GetNoteTitles(folder)
			.then((v) => {
				setNotes(v);
			})
			.catch(() => setNotes([]));
	}, [folder]);

	useMotionValueEvent(folderSidebarWidth, "change", (latest) =>
		setLeftWidth(latest),
	);

	const noteElements = notes?.map((noteName) => (
		<li key={noteName} className="flex gap-2 items-center pl-3 pb-2">
			<Note className="min-w-[1.25rem]" />{" "}
			<p className="whitespace-nowrap text-ellipsis overflow-hidden">
				{noteName}.md
			</p>
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
					/>
				)}
			</AnimatePresence>
			<motion.aside
				style={{ width: notesSidebarWidth }}
				className={cn("text-md h-screen flex flex-col gap-2")}
			>
				<div
					className="h-3 cursor-grab active:cursor-grabbing"
					style={{ "--wails-draggable": "drag" } as CSSProperties}
				/>
				<div className="px-[10px] flex flex-col gap-4">
					<section className="flex gap-3">
						<Folder className="min-w-[1.25rem]" />{" "}
						<p className="whitespace-nowrap text-ellipsis overflow-hidden">
							{folder}
						</p>
					</section>
					<MotionButton
						{...getDefaultButtonVariants()}
						onClick={() => setIsNoteDialogOpen(true)}
						className="w-full bg-transparent flex justify-between align-center"
					>
						Create Note <Compose />
					</MotionButton>
					<section className="flex flex-col gap-3">
						<p>Your Notes</p>
						<ul>
							{noteElements ?? (
								<li className="text-center text-zinc-500 dark:text-zinc-300  text-xs">
									Create a note with the "Create Note" button above
								</li>
							)}
						</ul>
					</section>
				</div>
			</motion.aside>
			<Spacer sidebarWidth={notesSidebarWidth} leftWidth={leftWidth} />
		</>
	);
}
