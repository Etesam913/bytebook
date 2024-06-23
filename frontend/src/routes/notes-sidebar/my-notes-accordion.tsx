import { Events } from "@wailsio/runtime";
import { motion } from "framer-motion";
import { useAtomValue, useSetAtom } from "jotai";
import { type CSSProperties, useState } from "react";
import { Link, useParams } from "wouter";
import { draggedElementAtom, selectionRangeAtom } from "../../atoms";
import { Sidebar } from "../../components/sidebar";
import { handleDragStart } from "../../components/sidebar/utils";
import { ChevronDown } from "../../icons/chevron-down";
import { useSearchParamsEntries } from "../../utils/hooks";
import { cn, extractInfoFromNoteName } from "../../utils/string-formatting";
import { RenderNoteIcon } from "./render-note-icon";

export function MyNotesAccordion({
	notes,
}: {
	notes: string[] | null;
}) {
	const { folder: curFolder, note: curNote } = useParams();
	const searchParams: { ext?: string } = useSearchParamsEntries();
	const noteNameWithExtension = `${curNote}?ext=${searchParams.ext}`;
	const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
	const selectionRange = useAtomValue(selectionRangeAtom);
	const setDraggedElement = useSetAtom(draggedElementAtom);

	return (
		<section className="flex flex-1 flex-col gap-2 overflow-y-auto">
			<div className="flex items-center gap-1.5 py-1 rounded-md px-0.5 transition-colors">
				My Notes{" "}
				{notes && notes.length > 0 && (
					<span className="tracking-wider">({notes.length})</span>
				)}
			</div>
			<Sidebar
				emptyElement={
					<li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
						Create a note with the "Create Note" button above
					</li>
				}
				isCollapsed={isNotesCollapsed}
				data={notes}
				renderLink={({
					dataItem: sidebarNoteName,
					i,
					selectionRange,
					setSelectionRange,
				}) => {
					const { noteNameWithoutExtension: noteName, queryParams } =
						extractInfoFromNoteName(sidebarNoteName);

					return (
						<Link
							title={sidebarNoteName}
							draggable
							onDragStart={(e) =>
								handleDragStart(
									e,
									setSelectionRange,
									"note",
									notes?.at(i) ?? "",
									setDraggedElement,
									curFolder,
								)
							}
							onContextMenu={() => {
								if (selectionRange.size === 0) {
									setSelectionRange(new Set([sidebarNoteName]));
								} else {
									setSelectionRange((prev) => {
										const tempSet = new Set(prev);
										tempSet.add(sidebarNoteName);
										return tempSet;
									});
								}
							}}
							onDoubleClick={() => {
								Events.Emit({
									name: "open-note-in-new-window-backend",
									data: { url: `/${curFolder}/${sidebarNoteName}` },
								});
							}}
							target="_blank"
							className={cn(
								"flex flex-1 gap-2 items-center px-2 py-1 z-10 rounded-md relative overflow-x-hidden transition-colors will-change-transform",
								noteNameWithExtension === sidebarNoteName &&
									"bg-zinc-150 dark:bg-zinc-700",
								notes?.at(i) &&
									selectionRange.has(notes[i]) &&
									"!bg-blue-400 dark:!bg-blue-600 text-white",
							)}
							to={`/${curFolder}/${sidebarNoteName}`}
						>
							<RenderNoteIcon
								sidebarNoteName={sidebarNoteName}
								fileExtension={queryParams.ext}
								noteNameWithExtension={noteNameWithExtension}
							/>
							<p className="whitespace-nowrap text-ellipsis overflow-hidden">
								{noteName}.{queryParams.ext}
							</p>
						</Link>
					);
				}}
				getContextMenuStyle={() =>
					({
						"--custom-contextmenu": "note-context-menu",
						"--custom-contextmenu-data": [...selectionRange],
					}) as CSSProperties
				}
			/>
		</section>
	);
}
