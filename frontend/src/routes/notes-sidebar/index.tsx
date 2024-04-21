import { AnimatePresence, type MotionValue, motion } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { type CSSProperties, useEffect, useState } from "react";
import { Link } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { DeleteFolder } from "../../../bindings/main/FolderService.ts";
import {
	isFolderDialogOpenAtom,
	isNoteMaximizedAtom,
	mostRecentNotesAtom,
	notesAtom,
} from "../../atoms";
import { MotionButton } from "../../components/buttons";
import { NotesEditor } from "../../components/editor";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { Compose } from "../../icons/compose";
import { FilePen } from "../../icons/file-pen.tsx";
import { Folder } from "../../icons/folder";
import { Note } from "../../icons/page";
import { Pen } from "../../icons/pen";
import { updateNotes } from "../../utils/fetch-functions";
import { useIsStandalone, useWailsEvent } from "../../utils/hooks.tsx";
import { updateMostRecentNotesOnNoteDelete } from "../../utils/misc.ts";
import { cn } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { NotesSidebarDialog } from "./sidebar-dialog";
import { Events } from "@wailsio/runtime";
import { WINDOW_ID } from "../../App.tsx";

export function NotesSidebar({
	params,
	width,
	leftWidth,
}: {
	params: { folder: string; note?: string };
	width: MotionValue<number>;
	leftWidth: MotionValue<number>;
}) {
	const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
	const [notes, setNotes] = useAtom(notesAtom);
	const [mostRecentNotes, setMostRecentNotes] = useAtom(mostRecentNotesAtom);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const { folder, note } = params;
	const setIsFolderDialogOpen = useSetAtom(isFolderDialogOpenAtom);
	const isStandalone = useIsStandalone();
	const [rightClickedNote, setRightClickedNote] = useState<string | null>(null);

	// Initially fetches notes for a folder using the filesystem
	useEffect(() => {
		updateNotes(folder, note, setNotes);
	}, [folder, setNotes]);

	// Updates notes state when notes are changed
	useWailsEvent("notes:changed", (body) => {
		const data = body.data as { windowId: string; notes: string[] | null };
		if (note && data.notes) {
			if (!data.notes.includes(note)) {
				const firstNote = data.notes.at(0);
				const newUrl = firstNote ? `/${folder}/${firstNote}` : `/${folder}`;
				navigate(newUrl);
			}
		}
		setNotes(data.notes);
	});

	useWailsEvent("delete-note", (event) => {
		const noteName = event.data as string;
		DeleteFolder(`${folder}/${noteName}`).then((res) => {
			if (res.success) {
				const remainingNotes = notes?.filter((v) => v !== noteName);
				if (remainingNotes) {
					Events.Emit({
						name: "notes:changed",
						data: { windowId: WINDOW_ID, notes: remainingNotes },
					});
					updateMostRecentNotesOnNoteDelete(
						folder,
						noteName,
						mostRecentNotes,
						setMostRecentNotes,
					);
					navigate(
						`/${folder}/${remainingNotes.length <= 0 ? "" : remainingNotes[0]}`,
					);
				}
			}
		});
	});

	useWailsEvent("open-note-in-new-window-frontend", () => {
		if (rightClickedNote) {
			Events.Emit({
				name: "open-note-in-new-window-backend",
				data: { folder, note: rightClickedNote },
			});
		}
	});

	const noteElements = notes?.map((noteName) => (
		<li key={noteName}>
			<div
				className="flex select-none items-center gap-2 overflow-hidden pr-1"
				style={
					{
						"--custom-contextmenu": "note-context-menu",
						"--custom-contextmenu-data": noteName,
					} as CSSProperties
				}
			>
				<Link
					onDoubleClick={() => {
						Events.Emit({
							name: "open-note-in-new-window-backend",
							data: { folder, note: noteName },
						});
					}}
					onContextMenu={() => setRightClickedNote(noteName)}
					title={noteName}
					className={cn(
						"mb-[0.15rem] flex flex-1 items-center gap-2 overflow-auto rounded-md px-2.5 py-[0.35rem]",
						noteName === note && "bg-zinc-100 dark:bg-zinc-700",
					)}
					to={`/${encodeURI(folder)}/${encodeURI(noteName)}`}
				>
					{noteName === note ? (
						<FilePen title="" className="min-w-[1.25rem]" />
					) : (
						<Note title="" className="min-w-[1.25rem]" />
					)}{" "}
					<p className="overflow-hidden text-ellipsis whitespace-nowrap">
						{noteName}
					</p>
				</Link>
			</div>
		</li>
	));

	return (
		<>
			<AnimatePresence>
				{isNoteDialogOpen && (
					<NotesSidebarDialog
						isNoteDialogOpen={isNoteDialogOpen}
						setIsNoteDialogOpen={setIsNoteDialogOpen}
						folderName={folder}
						notes={notes}
					/>
				)}
			</AnimatePresence>

			{!isNoteMaximized && !isStandalone && (
				<>
					<motion.aside
						style={{ width }}
						className="text-md flex h-screen flex-col gap-2 overflow-y-auto pt-[0.75rem]"
					>
						<div className="flex h-full flex-col gap-4 overflow-y-auto pl-1 pr-2.5 pt-[1px]">
							<section className="flex items-center gap-2">
								<Folder className="min-w-[1.25rem]" />{" "}
								<p className="overflow-hidden text-ellipsis whitespace-nowrap">
									{folder}
								</p>
								<motion.button
									type="button"
									data-testid="rename_folder_button"
									{...getDefaultButtonVariants(false, 1.15, 0.95, 1.15)}
									className="item-center flex min-w-[1.5rem] justify-center rounded-[0.5rem] p-[2.5px] transition-colors duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
									onClick={() =>
										setIsFolderDialogOpen({
											isOpen: true,
											action: "rename",
											folderName: folder,
										})
									}
								>
									<Pen className="w-full" />
								</motion.button>
							</section>
							<MotionButton
								{...getDefaultButtonVariants(false, 1.05, 0.95, 1.05)}
								onClick={() => setIsNoteDialogOpen(true)}
								className="align-center flex w-full justify-between bg-transparent"
							>
								Create Note <Compose />
							</MotionButton>
							<section className="flex flex-1 flex-col gap-2 overflow-y-auto">
								<p className="px-1.5 py-1">
									My Notes{" "}
									{noteElements && noteElements.length > 0 && (
										<span className="tracking-wider">
											({noteElements.length})
										</span>
									)}
								</p>
								<ul className="overflow-y-auto pb-2">
									{noteElements && noteElements.length > 0 ? (
										noteElements
									) : (
										<li className="text-center text-xs text-zinc-500 w-full dark:text-zinc-300">
											Create a note with the "Create Note" button above
										</li>
									)}
								</ul>
							</section>
						</div>
					</motion.aside>
					<Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
				</>
			)}

			{note && <NotesEditor params={{ folder, note }} />}
		</>
	);
}
