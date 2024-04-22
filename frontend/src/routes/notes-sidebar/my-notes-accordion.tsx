import { Events } from "@wailsio/runtime";
import { AnimatePresence, motion } from "framer-motion";
import {
	type CSSProperties,
	type Dispatch,
	type SetStateAction,
	useState,
} from "react";
import { Link } from "wouter";
import { ChevronDown } from "../../icons/chevron-down";
import { FilePen } from "../../icons/file-pen";
import { Note } from "../../icons/page";
import { cn } from "../../utils/string-formatting";

export function MyNotesAccordion({
	folder,
	note,
	notes,
	setRightClickedNote,
}: {
	folder: string;
	note: string | undefined;
	notes: string[] | null;
	setRightClickedNote: Dispatch<SetStateAction<string | null>>;
}) {
	const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);

	const noteElements = notes?.map((noteName) => (
		<li key={noteName}>
			<div
				className="flex select-none items-center gap-2 overflow-hidden pr-1"
				style={
					{
						"--custom-contextmenu": "note-context-menu",
						"--custom-contextmenu-data": noteName,
					} as CSSProperties
				}
			>
				<Link
					onDoubleClick={() => {
						Events.Emit({
							name: "open-note-in-new-window-backend",
							data: { folder, note: noteName },
						});
					}}
					onContextMenu={() => setRightClickedNote(noteName)}
					title={noteName}
					className={cn(
						"mb-[0.15rem] flex flex-1 items-center gap-2 overflow-auto rounded-md px-2.5 py-[0.35rem]",
						noteName === note && "bg-zinc-100 dark:bg-zinc-700",
					)}
					to={`/${encodeURI(folder)}/${encodeURI(noteName)}`}
				>
					{noteName === note ? (
						<FilePen title="" className="min-w-[1.25rem]" />
					) : (
						<Note title="" className="min-w-[1.25rem]" />
					)}{" "}
					<p className="overflow-hidden text-ellipsis whitespace-nowrap">
						{noteName}
					</p>
				</Link>
			</div>
		</li>
	));

	return (
		<section className="flex flex-1 flex-col gap-2 overflow-y-auto">
			<button
				className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 py-1 px-1.5 rounded-md transition-colors"
				onClick={() => setIsNotesCollapsed((prev) => !prev)}
				type="button"
			>
				<motion.span
					initial={{ rotateZ: isNotesCollapsed ? 270 : 0 }}
					animate={{ rotateZ: isNotesCollapsed ? 270 : 0 }}
				>
					<ChevronDown strokeWidth="2.5px" height="0.8rem" width="0.8rem" />
				</motion.span>{" "}
				My Notes{" "}
				{noteElements && noteElements.length > 0 && (
					<span className="tracking-wider">({noteElements.length})</span>
				)}
			</button>
			<AnimatePresence>
				{!isNotesCollapsed && (
					<motion.ul
						initial={{ height: 0 }}
						animate={{
							height: "auto",
							transition: { type: "spring", damping: 16 },
						}}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-y-auto pb-2"
					>
						{noteElements && noteElements.length > 0 ? (
							noteElements
						) : (
							<li className="text-center text-xs text-zinc-500 w-full dark:text-zinc-300">
								Create a note with the "Create Note" button above
							</li>
						)}
					</motion.ul>
				)}
			</AnimatePresence>
		</section>
	);
}
