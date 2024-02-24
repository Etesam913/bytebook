import { AnimatePresence, MotionValue, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { DeleteFolder, GetNoteTitles } from "../../../wailsjs/go/main/App";
import { MotionButton } from "../../components/button";
import { NotesEditor } from "../../components/editor";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { Compose } from "../../icons/compose";
import { Folder } from "../../icons/folder";
import { Note } from "../../icons/page";
import { Trash } from "../../icons/trash";
import { cn } from "../../utils/tailwind";
import { getDefaultButtonVariants } from "../../variants";
import { NotesSidebarDialog } from "./sidebar-dialog";

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
	const [notes, setNotes] = useState<string[] | null>([]);

	const { folder, note } = params;

	useEffect(() => {
		GetNoteTitles(folder)
			.then((v) => {
				setNotes(v);
				navigate(`/${folder}${v.at(0) ? `/${v.at(0)}` : ""}`);
			})
			.catch(() => setNotes([]));
	}, [folder]);

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
						DeleteFolder(`${folder}/${noteName}`).then(() => {
							setNotes((prev) => prev?.filter((v) => v !== noteName) ?? null);
						})
					}
					{...getDefaultButtonVariants(1.15, 0.95, 1.15)}
					type="button"
					className="min-w-[20px] p-1 rounded-[0.3rem] flex item-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700"
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
			<motion.aside
				style={{ width }}
				className="pt-5 text-md h-screen flex flex-col gap-2 overflow-y-auto"
			>
				{/* <div
					className="h-3 cursor-grab active:cursor-grabbing"
					style={{ "--wails-draggable": "drag" } as CSSProperties}
				/> */}
				<div className="px-[10px] flex flex-col gap-4 h-full overflow-y-auto">
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
