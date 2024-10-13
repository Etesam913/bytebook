import { useAtom, useAtomValue, useSetAtom } from "jotai/react";
import type { CSSProperties } from "react";
import {
	draggedElementAtom,
	noteSortAtom,
	selectionRangeAtom,
} from "../../atoms";
import { SortButton } from "../../components/buttons/sort";
import { Sidebar } from "../../components/sidebar";
import { handleDragStart } from "../../components/sidebar/utils";
import { Note } from "../../icons/page";
import { useSearchParamsEntries } from "../../utils/hooks";
import { useCustomNavigate } from "../../utils/routing";
import { removeFoldersFromSelection } from "../../utils/selection";
import { cn, extractInfoFromNoteName } from "../../utils/string-formatting";
import { RenderNoteIcon } from "./render-note-icon";

export function MyNotesAccordion({
	notes,
	noteCount,
	curFolder,
	curNote,
	tagState,
}: {
	notes: string[] | null;
	noteCount: number;
	curFolder: string;
	curNote: string | undefined;
	tagState?: {
		tagName: string;
	};
}) {
	const searchParams: { ext?: string } = useSearchParamsEntries();
	const isInTagSidebar = tagState?.tagName !== undefined;

	// The sidebar note name includes the folder name if it's in a tag sidebar
	const sidebarNoteNameWithExtension = `${
		isInTagSidebar ? `${curFolder}/` : ""
	}${curNote}?ext=${searchParams.ext}`;

	const selectionRange = useAtomValue(selectionRangeAtom);
	const setDraggedElement = useSetAtom(draggedElementAtom);
	const [noteSortData, setNoteSortData] = useAtom(noteSortAtom);
	const { navigate } = useCustomNavigate();
	return (
		<div className="flex flex-1 flex-col gap-1 overflow-y-auto">
			<div className="flex items-center justify-between gap-2 pr-1">
				<p className="flex items-center gap-1.5 py-1 rounded-md px-0.5 transition-colors">
					<Note title="Note" className="min-w-[1.25rem]" />
					My Notes{" "}
					{noteCount > 0 && (
						<span className="tracking-wider">({noteCount})</span>
					)}
				</p>

				<SortButton
					sortDirection={noteSortData}
					setSortDirection={setNoteSortData}
				/>
			</div>
			<Sidebar
				contentType="note"
				layoutId="recent-notes-accordion"
				emptyElement={
					<li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
						Create a note with the "Create Note" button above
					</li>
				}
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
						<button
							type="button"
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
									setSelectionRange(new Set([`note:${sidebarNoteName}`]));
								} else {
									setSelectionRange((prev) => {
										const setWithoutNotes = removeFoldersFromSelection(prev);
										setWithoutNotes.add(`note:${sidebarNoteName}`);
										return setWithoutNotes;
									});
								}
							}}
							// target="_blank"
							className={cn(
								"sidebar-item",
								sidebarNoteNameWithExtension === sidebarNoteName &&
									"bg-zinc-150 dark:bg-zinc-700",
								notes?.at(i) &&
									selectionRange.has(`note:${notes[i]}`) &&
									"!bg-blue-400 dark:!bg-blue-600 text-white",
							)}
							onClick={(e) => {
								if (e.metaKey || e.shiftKey) return;
								navigate(
									isInTagSidebar
										? `/tags/${tagState.tagName}/${sidebarNoteName}`
										: `/${curFolder}/${sidebarNoteName}`,
								);
							}}
						>
							<RenderNoteIcon
								sidebarNoteName={sidebarNoteName}
								fileExtension={queryParams.ext}
								noteNameWithExtension={sidebarNoteNameWithExtension}
							/>
							<p className="whitespace-nowrap text-ellipsis overflow-hidden">
								{isInTagSidebar ? noteName.split("/")[1] : noteName}.
								{queryParams.ext}
							</p>
						</button>
					);
				}}
				getContextMenuStyle={() =>
					({
						"--custom-contextmenu": "note-context-menu",
						"--custom-contextmenu-data": [...selectionRange].map(
							(selectionRangeItem) => {
								const indexOfColon = selectionRangeItem.indexOf(":");
								const noteNameWithExtension = selectionRangeItem.substring(
									indexOfColon + 1,
								);
								const noteNameWithoutExtension =
									noteNameWithExtension.split("?ext=")[0];
								const extension = noteNameWithExtension.split("?ext=")[1];
								return `${curFolder}/${noteNameWithoutExtension}.${extension}`;
							},
						),
					}) as CSSProperties
				}
			/>
		</div>
	);
}
