import { Events } from "@wailsio/runtime";
import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import {
	type CSSProperties,
	type Dispatch,
	type SetStateAction,
	useState,
} from "react";
import { Link } from "wouter";
import { selectionRangeAtom } from "../../atoms";
import { Sidebar } from "../../components/sidebar";
import { handleDragStart } from "../../components/sidebar/utils";
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
	const selectionRange = useAtomValue(selectionRangeAtom);

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
				{notes && notes.length > 0 && (
					<span className="tracking-wider">({notes.length})</span>
				)}
			</button>
			<Sidebar
				emptyElement={
					<li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
						Create a note with the "Create Note" button above
					</li>
				}
				isCollapsed={isNotesCollapsed}
				data={notes}
				renderLink={({
					dataItem: noteName,
					i,
					selectionRange,
					setSelectionRange,
				}) => (
					<Link
						draggable
						onDragStart={(e) =>
							handleDragStart(
								e,
								setSelectionRange,
								"note",
								notes?.at(i) ?? "",
								folder,
							)
						}
						onContextMenu={() => setRightClickedNote(noteName)}
						onDoubleClick={() => {
							Events.Emit({
								name: "open-note-in-new-window-backend",
								data: { folder, note: noteName },
							});
						}}
						target="_blank"
						className={cn(
							"flex flex-1 gap-2 items-center px-2 py-1 rounded-md relative z-10 overflow-x-hidden transition-colors will-change-transform",
							noteName === note && "bg-zinc-150 dark:bg-zinc-700",
							notes?.at(i) &&
								selectionRange.has(notes[i]) &&
								"!bg-blue-400 dark:!bg-blue-600 text-white",
						)}
						to={`/${folder}/${noteName}`}
					>
						{note === noteName ? (
							<FilePen title="" className="min-w-[1.25rem]" />
						) : (
							<Note title="" className="min-w-[1.25rem]" />
						)}{" "}
						<p className="whitespace-nowrap text-ellipsis overflow-hidden">
							{noteName}
						</p>
					</Link>
				)}
				getContextMenuStyle={(noteName) =>
					({
						"--custom-contextmenu": "note-context-menu",
						"--custom-contextmenu-data": [...selectionRange],
					}) as CSSProperties
				}
			/>
		</section>
	);
}
