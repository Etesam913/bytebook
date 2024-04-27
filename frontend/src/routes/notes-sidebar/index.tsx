import { Events } from "@wailsio/runtime";
import { AnimatePresence, type MotionValue, motion } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { navigate } from "wouter/use-browser-location";
import { DeleteFolder } from "../../../bindings/main/FolderService.ts";
import { GetAttachments } from "../../../bindings/main/NoteService.ts";
import {
	attachmentsAtom,
	isFolderDialogOpenAtom,
	isNoteMaximizedAtom,
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
import {
	useOnClickOutside,
	useSearchParamsEntries,
	useWailsEvent,
} from "../../utils/hooks.tsx";
import { FILE_SERVER_URL } from "../../utils/misc.ts";
import { getDefaultButtonVariants } from "../../variants";
import { AttachmentsAccordion } from "./my-attachments-accordion.tsx";
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
	const setAttachments = useSetAtom(attachmentsAtom);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const { folder, note } = params;
	const searchParams: { ext?: string } = useSearchParamsEntries();
	const [attachmentsSelectionRange, setAttachmentsSelectionRange] = useState<
		Set<number>
	>(new Set());
	const sidebarRef = useRef<HTMLElement>(null);

	// If the fileExtension is undefined, then it is a markdown file
	const fileExtension = searchParams?.ext;

	const setIsFolderDialogOpen = useSetAtom(isFolderDialogOpenAtom);
	const [rightClickedNote, setRightClickedNote] = useState<string | null>(null);

	useOnClickOutside(sidebarRef, () => setAttachmentsSelectionRange(new Set()));

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

	useWailsEvent("note:create", (body) => {
		const data = body.data as { folder: string; note: string };
		if (data.folder !== folder) return;
		setNotes((prev) => [...prev, data.note]);
		navigate(`/${folder}/${data.note}`);
	});

	useWailsEvent("note:delete", (body) => {
		const data = body.data as { folder: string; note: string };
		if (data.folder !== folder) return;
		setNotes((prev) => {
			const newNotes = prev.filter((v) => v !== data.note);
			// The note that you are on is deleted
			if (note === data.note) {
				if (notes.length > 0) {
					navigate(`/${folder}/${newNotes[0]}`);
				} else {
					navigate(`/${folder}`);
				}
			}
			return newNotes;
		});
	});

	useWailsEvent("attachments:changed", (body) => {
		const data = body.data as {
			windowId: string;
			attachments: string[];
		};
		setAttachments(data.attachments);
	});

	useWailsEvent("attachments:context-menu:delete-attachment", async (body) => {
		const bodyData = JSON.parse(body.data as string) as { file: string };
		const { file: fileToDelete } = bodyData;

		try {
			const hasDeletedAttachment = await DeleteFolder(
				`${folder}/attachments/${fileToDelete}`,
			);
			if (hasDeletedAttachment.success) {
				setAttachments((prev) => prev.filter((v) => v !== fileToDelete));
			} else {
				throw new Error();
			}
		} catch {
			toast.error("Failed to delete attachment");
		}
	});

	useWailsEvent("note:context-menu:delete-note", (event) => {
		const noteName = event.data as string;
		DeleteFolder(`${folder}/${noteName}.md`)
			.then((res) => {
				if (!res.success) {
					throw new Error();
				}
			})
			.catch(() => {
				toast.error("Failed to delete note");
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
						ref={sidebarRef}
						onClick={() => setAttachmentsSelectionRange(new Set())}
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
							<AttachmentsAccordion
								folder={folder}
								note={note}
								attachmentsSelectionRange={attachmentsSelectionRange}
								setAttachmentsSelectionRange={setAttachmentsSelectionRange}
							/>
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
			{note?.endsWith(".pdf") && (
				<div className="flex-1 overflow-auto">
					<iframe
						title={note}
						className="w-full h-full"
						src={`${FILE_SERVER_URL}/notes/${folder}/attachments/${note}`}
					/>
				</div>
			)}
		</>
	);
}
