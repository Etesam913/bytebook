import { useAtom } from "jotai/react";
import { useMemo } from "react";
import { noteSortAtom } from "../../atoms";
import { SortButton } from "../../components/buttons/sort";
import { Sidebar } from "../../components/sidebar";
import { Note } from "../../icons/page";
import { useSearchParamsEntries } from "../../utils/routing";
import { extractInfoFromNoteName } from "../../utils/string-formatting";
import { NoteSidebarButton } from "./note-sidebar-button.tsx";

export function MyNotesAccordion({
	notes,
	curFolder,
	curNote,
	tagState,
	layoutId,
}: {
	notes: string[];
	curFolder: string;
	curNote: string | undefined;
	tagState?: {
		tagName: string;
	};
	layoutId: string;
}) {
	const noteCount = useMemo(() => notes?.length ?? 0, [notes]);
	// The sidebar note name includes the folder name if it's in a tag sidebar
	const [noteSortData, setNoteSortData] = useAtom(noteSortAtom);
	const searchParams: { ext?: string } = useSearchParamsEntries();
	// If the fileExtension is undefined, then it is a markdown file
	const fileExtension = searchParams?.ext;
	const activeDataItem = useMemo(
		() => (curNote ? `${curNote}?ext=${fileExtension}` : null),
		[curNote, fileExtension],
	);

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
				key={layoutId}
				layoutId={layoutId}
				emptyElement={
					<li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
						Create a note with the "Create Note" button above
					</li>
				}
				activeDataItem={activeDataItem}
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
