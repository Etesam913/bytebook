import { AnimatePresence, MotionValue, motion } from "framer-motion";
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
import { Link, useRoute } from "wouter";
import { Trash } from "../../icons/trash";

export function NotesSidebar({
	params,
	width,
	leftWidth,
}: {
	params: { folder: string };
	width: MotionValue<number>;
	leftWidth: MotionValue<number>;
}) {
	const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
	const [notes, setNotes] = useState<string[] | null>([]);
	const [, noteParam] = useRoute("/:note");
	const { folder } = params;
	const note = noteParam?.note;

	useEffect(() => {
		GetNoteTitles(folder)
			.then((v) => {
				setNotes(v);
			})
			.catch(() => setNotes([]));
	}, [folder]);

	const noteElements = notes?.map((noteName, i) => (
		<li key={noteName}>
			<Link
				replace
				className={cn(
					"flex gap-2 items-center px-3 py-[0.45rem] mb-[0.15rem] rounded-md",
					noteName === note && "bg-zinc-100 dark:bg-zinc-700",
				)}
				to={`/${noteName}`}
			>
				<Note className="min-w-[1.25rem]" />{" "}
				<p className="whitespace-nowrap text-ellipsis overflow-hidden">
					{noteName}
				</p>
			</Link>
			{/* <Trash /> */}
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
				style={{ width }}
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
			<Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
		</>
	);
}
