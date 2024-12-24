import { useQueryClient } from "@tanstack/react-query";
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
	useNoteRevealInFinderMutation,
	usePinNotesMutation,
} from "../../hooks/note-events";
import { Finder } from "../../icons/finder";
import { PinTack2 } from "../../icons/pin-tack-2";
import { PinTackSlash } from "../../icons/pin-tack-slash";
import TagPlus from "../../icons/tag-plus";
import { Trash } from "../../icons/trash";
import { useSearchParamsEntries } from "../../utils/hooks";
import { useCustomNavigate } from "../../utils/routing";
import {
	getFolderAndNoteFromSelectionRange,
	handleKeyNavigation,
	removeFoldersFromSelection,
} from "../../utils/selection";
import { cn } from "../../utils/string-formatting";
import { AddTagDialogChildren } from "./add-tag-dialog-children";
import { RenderNoteIcon } from "./render-note-icon";

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
	const queryClient = useQueryClient();
	const { mutate: pinOrUnpinNote } = usePinNotesMutation();
	const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
	const { mutate: moveToTrash } = useMoveNoteToTrashMutation();
	const { mutateAsync: addPathsToTags } = useAddTagsMutation(queryClient);
	const setDialogData = useSetAtom(dialogDataAtom);
	const setContextMenuData = useSetAtom(contextMenuDataAtom);
	const projectSettings = useAtomValue(projectSettingsAtom);
	const setDraggedElement = useSetAtom(draggedElementAtom);
	const searchParams: { ext?: string } = useSearchParamsEntries();

	const isInTagSidebar = tagState?.tagName !== undefined;
	const sidebarNoteNameWithExtension = `${
		isInTagSidebar ? `${curFolder}/` : ""
	}${curNote}?ext=${searchParams.ext}`;

	const isActive = useMemo(
		() => decodeURIComponent(sidebarNoteNameWithExtension) === sidebarNoteName,
		[sidebarNoteNameWithExtension, sidebarNoteName],
	);

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
					setSelectionRange(new Set([`note:${sidebarNoteName}`]));
				} else {
					setSelectionRange((prev) => {
						const setWithoutNotes = removeFoldersFromSelection(prev);
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
									Add Tags
								</span>
							),
							value: "add-tags",
							onChange: () => {
								setDialogData({
									isOpen: true,
									title: "Add Tags",
									children: (errorText) => (
										<AddTagDialogChildren onSubmitErrorText={errorText} />
									),
									onSubmit: async (e, setErrorText) => {
										return addPathsToTags({
											e,
											setErrorText,
											folder: curFolder,
											note: curNote ?? "",
											ext: sidebarQueryParams.ext,
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
				"sidebar-item",
				isActive && "bg-zinc-150 dark:bg-zinc-700",
				notes?.at(i) &&
					selectionRange.has(`note:${notes[i]}`) &&
					"!bg-blue-400 dark:!bg-blue-600 text-white",
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
			<RenderNoteIcon
				sidebarNoteName={sidebarNoteName}
				fileExtension={sidebarQueryParams.ext}
				noteNameWithExtension={sidebarNoteNameWithExtension}
			/>
			<p className="whitespace-nowrap pointer-events-none text-ellipsis overflow-hidden">
				{isInTagSidebar
					? sidebarNoteNameWithoutExtension.split("/")[1]
					: sidebarNoteNameWithoutExtension}
				.{sidebarQueryParams.ext}
			</p>
		</button>
	);
}
