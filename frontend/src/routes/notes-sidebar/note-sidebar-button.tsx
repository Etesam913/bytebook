import { useAtomValue, useSetAtom } from "jotai/react";
import { type Dispatch, type SetStateAction, useMemo } from "react";
import {
	contextMenuDataAtom,
	dialogDataAtom,
	draggedElementAtom,
	projectSettingsAtom,
} from "../../atoms";
import { handleDragStart } from "../../components/sidebar/utils";
import {
	useAddTagsMutation,
	useMoveNoteToTrashMutation,
	useNotePreviewQuery,
	useNoteRevealInFinderMutation,
	usePinNotesMutation,
} from "../../hooks/note-events";
import { Finder } from "../../icons/finder";
import { PinTack2 } from "../../icons/pin-tack-2";
import { PinTackSlash } from "../../icons/pin-tack-slash";
import TagPlus from "../../icons/tag-plus";
import { Trash } from "../../icons/trash";
import { IMAGE_FILE_EXTENSIONS } from "../../types";
import { FILE_SERVER_URL } from "../../utils/general";
import { useCustomNavigate } from "../../utils/routing";
import { useSearchParamsEntries } from "../../utils/routing";
import {
	getFolderAndNoteFromSelectionRange,
	handleKeyNavigation,
	keepSelectionNotesWithPrefix,
} from "../../utils/selection";
import { cn } from "../../utils/string-formatting";
import { AddTagDialogChildren } from "./add-tag-dialog-children";
import { CardNoteSidebarItem } from "./card-note-sidebar-item";
import { ListNoteSidebarItem } from "./list-note-sidebar-item";

export function NoteSidebarButton({
	curFolder,
	curNote,
	sidebarNoteName,
	sidebarNoteNameWithoutExtension,
	sidebarQueryParams,
	selectionRange,
	setSelectionRange,
	notes,
	i,
	tagState,
}: {
	curNote: string | undefined;
	curFolder: string;
	sidebarNoteName: string;
	sidebarNoteNameWithoutExtension: string;
	sidebarQueryParams: {
		[key: string]: string;
	};
	selectionRange: Set<string>;
	setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
	notes: string[] | null;
	i: number;
	tagState?: {
		tagName: string;
	};
}) {
	const { navigate } = useCustomNavigate();
	const { mutate: pinOrUnpinNote } = usePinNotesMutation();
	const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
	const { mutate: moveToTrash } = useMoveNoteToTrashMutation();
	const { mutateAsync: addPathsToTags } = useAddTagsMutation();
	const setDialogData = useSetAtom(dialogDataAtom);
	const setContextMenuData = useSetAtom(contextMenuDataAtom);
	const projectSettings = useAtomValue(projectSettingsAtom);
	const setDraggedElement = useSetAtom(draggedElementAtom);
	const searchParams: { ext?: string } = useSearchParamsEntries();
	const isInTagSidebar = tagState?.tagName !== undefined;
	const activeNoteNameWithExtension = `${
		isInTagSidebar ? `${curFolder}/` : ""
	}${curNote}?ext=${searchParams.ext}`;

	const { data: notePreviewResult } = useNotePreviewQuery(
		decodeURIComponent(curFolder),
		decodeURIComponent(sidebarNoteNameWithoutExtension),
		sidebarQueryParams.ext,
	);
	const imgSrc = useMemo(() => {
		const notePreviewResultData = notePreviewResult?.data;
		if (!notePreviewResultData || notePreviewResultData.firstImageSrc === "") {
			if (IMAGE_FILE_EXTENSIONS.includes(sidebarQueryParams.ext)) {
				// For tags, the sidebarNoteNameWithoutExtension includes both the folder and the note name
				if (tagState?.tagName) {
					return `${FILE_SERVER_URL}/notes/${sidebarNoteNameWithoutExtension}.${sidebarQueryParams.ext}`;
				}
				return `${FILE_SERVER_URL}/notes/${curFolder}/${sidebarNoteNameWithoutExtension}.${sidebarQueryParams.ext}`;
			}
			return "";
		}
		return notePreviewResultData.firstImageSrc;
	}, [notePreviewResult]);
	const isActive = useMemo(
		() => decodeURIComponent(activeNoteNameWithExtension) === sidebarNoteName,
		[activeNoteNameWithExtension, sidebarNoteName],
	);
	const isSelected = useMemo(
		() => selectionRange.has(`note:${notes?.[i]}`) ?? false,
		[selectionRange, notes, i],
	);
	if (!notes) return null;
	return (
		<button
			type="button"
			title={sidebarNoteName}
			draggable
			id={isActive ? "selected-note-button" : undefined}
			onKeyDown={(e) => handleKeyNavigation(e)}
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
					setSelectionRange(newSelectionRange);
				} else {
					setSelectionRange((prev) => {
						const setWithoutNotes = keepSelectionNotesWithPrefix(prev, "note");
						setWithoutNotes.add(`note:${sidebarNoteName}`);
						newSelectionRange = setWithoutNotes;
						return setWithoutNotes;
					});
				}
				const folderAndNoteNames = getFolderAndNoteFromSelectionRange(
					curFolder,
					newSelectionRange,
				);
				const isShowingPinOption = folderAndNoteNames.some(
					(folderAndNoteName) =>
						!projectSettings.pinnedNotes.has(folderAndNoteName),
				);
				const isShowingUnpinOption = folderAndNoteNames.some(
					(folderAndNoteName) =>
						projectSettings.pinnedNotes.has(folderAndNoteName),
				);

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
						isShowingPinOption && {
							label: (
								<span className="flex items-center gap-1.5">
									<PinTack2
										width={17}
										height={17}
										className="will-change-transform"
									/>{" "}
									Pin Notes
								</span>
							),
							value: "pin-note",
							onChange: () => {
								pinOrUnpinNote({
									folder: curFolder,
									selectionRange: newSelectionRange,
									shouldPin: true,
								});
							},
						},
						isShowingUnpinOption && {
							label: (
								<span className="flex items-center gap-1.5">
									<PinTackSlash
										width={17}
										height={17}
										className="will-change-transform"
									/>{" "}
									Unpin Notes
								</span>
							),
							value: "unpin-note",
							onChange: () => {
								pinOrUnpinNote({
									folder: curFolder,
									selectionRange: newSelectionRange,
									shouldPin: false,
								});
							},
						},
						{
							label: (
								<span className="flex items-center gap-1.5">
									<TagPlus
										width={17}
										height={17}
										className="will-change-transform"
									/>{" "}
									Edit Tags
								</span>
							),
							value: "edit-tags",
							onChange: () => {
								setDialogData({
									isOpen: true,
									isPending: false,
									title: "Edit Tags",
									children: (errorText) => (
										<AddTagDialogChildren onSubmitErrorText={errorText} />
										// <EditTagDialogChildren
										// 	onSubmitErrorText={errorText}
										// 	selectionRange={newSelectionRange}
										// 	curFolder={curFolder}
										// />
									),
									onSubmit: async (e, setErrorText) => {
										// const formElement = e.target as HTMLFormElement;
										// const formCheckboxElements = formElement.querySelectorAll(
										// 	"input[type='checkbox']",
										// ) as NodeListOf<HTMLInputElement>;
										// const tagsToAdd = Array.from(formCheckboxElements)
										// 	.filter(
										// 		(checkbox) =>
										// 			checkbox.value === "on" && !checkbox.indeterminate,
										// 	)
										// 	.map((checkbox) => checkbox.name);
										// const tagsToRemove = Array.from(
										// 	formCheckboxElements,
										// ).filter((checkbox) => !checkbox.value);
										// const addPathsResponse = addPathsToTags({
										// 	e,
										// 	setErrorText,
										// 	folder: curFolder,
										// 	selectionRange: newSelectionRange,
										// });
										// return true;
										return addPathsToTags({
											e,
											setErrorText,
											folder: curFolder,
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
									Move to Trash
								</span>
							),
							value: "move-to-trash",
							onChange: () =>
								moveToTrash({
									selectionRange: newSelectionRange,
									folder: curFolder,
								}),
						},
					].filter(Boolean),
				});
			}}
			className={cn(
				projectSettings.noteSidebarItemSize === "list" && "list-sidebar-item",
				projectSettings.noteSidebarItemSize === "card" && "card-sidebar-item",
				projectSettings.noteSidebarItemSize === "card" && i === 0 && "border-t",
				isActive && "bg-zinc-150 dark:bg-zinc-700",
				isSelected && "!bg-[var(--accent-color)] text-white",
			)}
			onClick={(e) => {
				if (e.metaKey || e.shiftKey) return;
				const buttonElem = e.target as HTMLButtonElement;
				buttonElem.focus();
				navigate(
					isInTagSidebar
						? `/tags/${tagState.tagName}/${sidebarNoteName}`
						: `/${curFolder}/${sidebarNoteName}`,
				);
			}}
		>
			{projectSettings.noteSidebarItemSize === "list" && (
				<ListNoteSidebarItem
					sidebarNoteName={sidebarNoteName}
					sidebarQueryParams={sidebarQueryParams}
					activeNoteNameWithExtension={activeNoteNameWithExtension}
					sidebarNoteNameWithoutExtension={sidebarNoteNameWithoutExtension}
					isInTagSidebar={isInTagSidebar}
				/>
			)}

			{projectSettings.noteSidebarItemSize === "card" && (
				<CardNoteSidebarItem
					imgSrc={imgSrc}
					sidebarQueryParams={sidebarQueryParams}
					sidebarNoteNameWithoutExtension={sidebarNoteNameWithoutExtension}
					isInTagSidebar={isInTagSidebar}
					notePreviewResult={notePreviewResult ?? null}
					isSelected={isSelected}
				/>
			)}
		</button>
	);
}
