import type { UseQueryResult } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAtom } from "jotai/react";
import { useMemo } from "react";
import { getDefaultButtonVariants } from "../../animations.ts";
import { noteSortAtom } from "../../atoms";
import { MotionButton } from "../../components/buttons/index.tsx";
import { SortButton } from "../../components/buttons/sort";
import { Sidebar } from "../../components/sidebar";
import { FileRefresh } from "../../icons/file-refresh.tsx";
import { Loader } from "../../icons/loader.tsx";
import { Note } from "../../icons/page";
import { NoteSidebarButton } from "./note-sidebar-button.tsx";

export function MyNotesAccordion({
	curFolder,
	curNote,
	fileExtension,
	tagState,
	layoutId,
	noteQueryResult,
}: {
	curFolder: string;
	curNote: string | undefined;
	fileExtension: string | undefined;
	tagState?: {
		tagName: string;
	};
	layoutId: string;
	noteQueryResult: UseQueryResult<string[], Error>;
}) {
	const { data: notes, refetch, isError, isLoading } = noteQueryResult;

	const noteCount = useMemo(() => notes?.length ?? 0, [notes]);
	// The sidebar note name includes the folder name if it's in a tag sidebar
	const [noteSortData, setNoteSortData] = useAtom(noteSortAtom);
	// If the fileExtension is undefined, then it is a markdown file
	const activeDataItem = useMemo(
		() => (curNote ? `${curNote}?ext=${fileExtension}` : null),
		[curNote, fileExtension],
	);

	const isInTagSidebar = useMemo(
		() => tagState?.tagName !== undefined,
		[tagState],
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
			{isError && (
				<div className="text-center text-xs my-3 flex flex-col items-center gap-2 text-balance">
					<p className="text-red-500">
						Something went wrong when fetching the notes
					</p>
					<MotionButton
						{...getDefaultButtonVariants(false, 1.025, 0.975, 1.025)}
						className="mx-2.5 flex text-center"
						onClick={() => refetch()}
					>
						<span>Retry</span>{" "}
						<FileRefresh
							className="will-change-transform"
							width={16}
							height={16}
						/>
					</MotionButton>
				</div>
			)}
			{!isError &&
				(isLoading ? (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.35 }}
					>
						<Loader width={20} height={20} className="mx-auto my-3" />
					</motion.div>
				) : (
					<Sidebar
						contentType="note"
						key={layoutId}
						layoutId={layoutId}
						emptyElement={
							<li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
								Create a note with the &quot;Create Note&quot; button above
							</li>
						}
						activeDataItem={activeDataItem}
						data={notes ?? []}
						renderLink={({
							dataItem: sidebarNoteNameTemp,
							i,
							selectionRange,
							setSelectionRange,
						}) => {
							let sidebarNoteFolder = curFolder;
							let sidebarNoteName = sidebarNoteNameTemp;

							// If the sidebar is a tag sidebar, then the folder and note do not come from the url
							if (isInTagSidebar) {
								sidebarNoteFolder = sidebarNoteName.split("/")[0];
								sidebarNoteName = sidebarNoteName.split("/")[1];
							}

							return (
								<NoteSidebarButton
									activeNoteNameWithoutExtension={curNote}
									sidebarNoteFolder={sidebarNoteFolder}
									sidebarNoteName={sidebarNoteName}
									sidebarNoteIndex={i}
									selectionRange={selectionRange}
									setSelectionRange={setSelectionRange}
									tagState={tagState}
								/>
							);
						}}
					/>
				))}
		</div>
	);
}
