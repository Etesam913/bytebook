import { useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue, useSetAtom } from "jotai/react";
import {
	contextMenuDataAtom,
	dialogDataAtom,
	draggedElementAtom,
	noteSortAtom,
	projectSettingsAtom,
} from "../../atoms";
import { SortButton } from "../../components/buttons/sort";
import { Sidebar } from "../../components/sidebar";
import { handleDragStart } from "../../components/sidebar/utils";
import {
	useAddTagsMutation,
	useNoteRevealInFinderMutation,
	useSendToTrashMutation,
} from "../../hooks/note-events.tsx";
import { Finder } from "../../icons/finder.tsx";
import { Note } from "../../icons/page";
import TagPlus from "../../icons/tag-plus.tsx";
import { Trash } from "../../icons/trash.tsx";
import { useSearchParamsEntries } from "../../utils/hooks";
import { useCustomNavigate } from "../../utils/routing";
import { removeFoldersFromSelection } from "../../utils/selection";
import { cn, extractInfoFromNoteName } from "../../utils/string-formatting";
import { AddTagDialogChildren } from "./add-tag-dialog-children.tsx";
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
	const queryClient = useQueryClient();
	const projectSettings = useAtomValue(projectSettingsAtom);
	const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
	const { mutate: sendToTrash } = useSendToTrashMutation();
	const { mutateAsync: addPathsToTags } = useAddTagsMutation(queryClient);

	const isInTagSidebar = tagState?.tagName !== undefined;
	const setContextMenuData = useSetAtom(contextMenuDataAtom);
	// The sidebar note name includes the folder name if it's in a tag sidebar
	const sidebarNoteNameWithExtension = `${
		isInTagSidebar ? `${curFolder}/` : ""
	}${curNote}?ext=${searchParams.ext}`;

	const setDraggedElement = useSetAtom(draggedElementAtom);
	const [noteSortData, setNoteSortData] = useAtom(noteSortAtom);
	const { navigate } = useCustomNavigate();
	const setDialogData = useSetAtom(dialogDataAtom);

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
							onContextMenu={(e) => {
								let newSelectionRange = new Set([`note:${sidebarNoteName}`]);
								if (selectionRange.size === 0) {
									setSelectionRange(new Set([`note:${sidebarNoteName}`]));
								} else {
									setSelectionRange((prev) => {
										const setWithoutNotes = removeFoldersFromSelection(prev);
										setWithoutNotes.add(`note:${sidebarNoteName}`);
										newSelectionRange = setWithoutNotes;
										return setWithoutNotes;
									});
								}

								setContextMenuData({
									x: e.clientX,
									y: e.clientY,
									isShowing: true,
									items: [
										{
											label: (
												<span className="flex items-center gap-1.5">
													<Finder
														width={17}
														height={17}
														className="will-change-transform"
													/>{" "}
													Reveal In Finder
												</span>
											),
											value: "reveal-in-finder",
											onChange: () =>
												revealInFinder({
													selectionRange: newSelectionRange,
													folder: curFolder,
												}),
										},
										{
											label: (
												<span className="flex items-center gap-1.5">
													<Finder
														width={17}
														height={17}
														className="will-change-transform"
													/>{" "}
													Pin Note
												</span>
											),
											value: "reveal-in-finder",
											onChange: () =>
												revealInFinder({
													selectionRange: newSelectionRange,
													folder: curFolder,
												}),
										},
										{
											label: (
												<span className="flex items-center gap-1.5">
													<TagPlus
														width={17}
														height={17}
														className="will-change-transform"
													/>{" "}
													Add Tags
												</span>
											),
											value: "add-tags",
											onChange: () => {
												setDialogData({
													isOpen: true,
													title: "Add Tags",
													children: (errorText) => (
														<AddTagDialogChildren
															onSubmitErrorText={errorText}
														/>
													),
													onSubmit: async (e, setErrorText) => {
														return addPathsToTags({
															e,
															setErrorText,
															folder: curFolder,
															note: curNote ?? "",
															ext: queryParams.ext,
															selectionRange: newSelectionRange,
														});
													},
												});
											},
										},
										{
											label: (
												<span className="flex items-center gap-1.5">
													<Trash
														width={17}
														height={17}
														className="will-change-transform"
													/>{" "}
													Send to Trash
												</span>
											),
											value: "send-to-trash",
											onChange: () =>
												sendToTrash({
													selectionRange: newSelectionRange,
													folder: curFolder,
												}),
										},
									],
								});
							}}
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
			/>
		</div>
	);
}
