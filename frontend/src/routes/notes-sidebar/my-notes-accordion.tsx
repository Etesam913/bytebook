import { Events } from "@wailsio/runtime";
import { motion } from "framer-motion";
import {
	type CSSProperties,
	type Dispatch,
	type SetStateAction,
	useState,
} from "react";
import { Link } from "wouter";
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
				isCollapsed={isNotesCollapsed}
				data={notes}
				renderLink={(noteName, isSelected, selectionRange) => (
					<Link
						draggable
						onDragStart={(e) =>
							handleDragStart(
								e,
								selectionRange,
								notes ?? [],
								noteName,
								"note",
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
							"flex flex-1 gap-2 items-center px-2 py-1 rounded-md relative z-10 overflow-x-hidden",
							(noteName === note || isSelected) &&
								"bg-zinc-150 dark:bg-zinc-700",
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
						"--custom-contextmenu-data": noteName,
					}) as CSSProperties
				}
			/>
		</section>
	);
}
