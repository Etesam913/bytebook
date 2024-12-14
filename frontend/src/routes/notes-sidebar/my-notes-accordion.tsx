import { useAtom } from "jotai/react";
import { noteSortAtom } from "../../atoms";
import { SortButton } from "../../components/buttons/sort";
import { Sidebar } from "../../components/sidebar";
import { Note } from "../../icons/page";
import { extractInfoFromNoteName } from "../../utils/string-formatting";
import { NoteSidebarButton } from "./note-sidebar-button.tsx";

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
	// The sidebar note name includes the folder name if it's in a tag sidebar
	const [noteSortData, setNoteSortData] = useAtom(noteSortAtom);

	return (
		<div className="flex flex-1 flex-col gap-1 overflow-y-auto">
			<div className="flex items-center justify-between gap-2 pr-1">
				<p className="flex items-center gap-1.5 py-1 rounded-md pl-[6px] pr-[10px] transition-colors">
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
					const { noteNameWithoutExtension, queryParams } =
						extractInfoFromNoteName(sidebarNoteName);

					return (
						<NoteSidebarButton
							curNote={curNote}
							curFolder={curFolder}
							sidebarNoteName={sidebarNoteName}
							sidebarNoteNameWithoutExtension={noteNameWithoutExtension}
							sidebarQueryParams={queryParams}
							selectionRange={selectionRange}
							setSelectionRange={setSelectionRange}
							notes={notes}
							i={i}
							tagState={tagState}
						/>
					);
				}}
			/>
		</div>
	);
}
