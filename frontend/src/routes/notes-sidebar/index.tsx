import { Events } from "@wailsio/runtime";
import { AnimatePresence, type MotionValue, motion } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { navigate } from "wouter/use-browser-location";
import { DeleteFolder } from "../../../bindings/main/FolderService.ts";
import { GetAttachments } from "../../../bindings/main/NoteService.ts";
import { WINDOW_ID } from "../../App.tsx";
import {
	attachmentsAtom,
	isFolderDialogOpenAtom,
	isNoteMaximizedAtom,
	mostRecentNotesAtom,
	notesAtom,
} from "../../atoms";
import { MotionButton } from "../../components/buttons";
import { NotesEditor } from "../../components/editor";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { Compose } from "../../icons/compose";
import { Folder } from "../../icons/folder";
import { Pen } from "../../icons/pen";
import { IMAGE_FILE_EXTENSIONS } from "../../types.ts";
import { updateNotes } from "../../utils/fetch-functions";
import { useSearchParamsEntries, useWailsEvent } from "../../utils/hooks.tsx";
import {
	FILE_SERVER_URL,
	updateMostRecentNotesOnNoteDelete,
} from "../../utils/misc.ts";
import { getDefaultButtonVariants } from "../../variants";
import { AttachmentsAccordion } from "./attachments-accordion.tsx";
import { MyNotesAccordion } from "./my-notes-accordion.tsx";
import { NotesSidebarDialog } from "./sidebar-dialog";

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
	const setAttachments = useSetAtom(attachmentsAtom);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const { folder, note } = params;
	const searchParams: { ext?: string } = useSearchParamsEntries();

	// If the fileExtension is undefined, then it is a markdown file
	const fileExtension = searchParams?.ext;

	const setIsFolderDialogOpen = useSetAtom(isFolderDialogOpenAtom);
	const [rightClickedNote, setRightClickedNote] = useState<string | null>(null);

	useEffect(() => {
		// Initially fetches notes for a folder using the filesystem
		updateNotes(folder, note, setNotes);

		GetAttachments(folder)
			.then((res) => {
				if (res.success) {
					setAttachments((res.data ?? []) as unknown as string[]);
				}
			})
			.catch((err) => {
				console.error(err);
			});
	}, [folder, setNotes, setAttachments]);

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

	useWailsEvent("attachments:changed", (body) => {
		console.log(body);
		const data = body.data as {
			windowId: string;
			attachments: string[];
		};
		setAttachments(data.attachments);
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

			{!isNoteMaximized && (
				<>
					<motion.aside
						style={{ width }}
						className="text-md flex h-screen flex-col gap-2 pl-1 pr-2.5  overflow-y-auto pt-[0.75rem] pb-3.5"
					>
						<div className="flex h-full flex-col gap-4 overflow-y-auto pt-[1px] relative">
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
							<MyNotesAccordion
								folder={folder}
								note={note}
								notes={notes}
								setRightClickedNote={setRightClickedNote}
							/>
							<AttachmentsAccordion folder={folder} note={note} />
						</div>
					</motion.aside>
					<Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
				</>
			)}

			{note && !fileExtension && <NotesEditor params={{ folder, note }} />}
			{note && IMAGE_FILE_EXTENSIONS.includes(fileExtension ?? "") && (
				<div className="flex-1 overflow-auto ">
					<img
						alt={note}
						className="w-full h-auto"
						src={`${FILE_SERVER_URL}/notes/${folder}/attachments/${note}`}
					/>
				</div>
			)}
		</>
	);
}
