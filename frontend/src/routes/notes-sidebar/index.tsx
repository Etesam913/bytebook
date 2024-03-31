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
import { Folder } from "../../icons/folder";
import { Note } from "../../icons/page";
import { Pen } from "../../icons/pen";
import { updateNotes } from "../../utils/fetch-functions";
import { useWailsEvent } from "../../utils/hooks.tsx";
import { updateMostRecentNotesOnNoteDelete } from "../../utils/misc.ts";
import { cn } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
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
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const { folder, note } = params;
	const setIsFolderDialogOpen = useSetAtom(isFolderDialogOpenAtom);

	useEffect(() => {
		updateNotes(folder, setNotes);
	}, [folder, setNotes]);

	useWailsEvent("delete-note", (event) => {
		const noteName = event.data as string;
		DeleteFolder(`${folder}/${noteName}`).then((res) => {
			if (res.success) {
				const remainingNotes = notes?.filter((v) => v !== noteName);
				if (remainingNotes) {
					navigate(
						`/${folder}/${remainingNotes.length <= 0 ? "" : remainingNotes[0]}`,
					);
					setNotes(remainingNotes);
					updateMostRecentNotesOnNoteDelete(
						folder,
						noteName,
						mostRecentNotes,
						setMostRecentNotes,
					);
				}
			}
		});
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
					className={cn(
						"mb-[0.15rem] flex flex-1 items-center gap-2 overflow-auto rounded-md px-3 py-[0.45rem]",
						noteName === note && "bg-zinc-100 dark:bg-zinc-700",
					)}
					to={`/${encodeURI(folder)}/${encodeURI(noteName)}`}
				>
					<Note className="min-w-[1.25rem]" />{" "}
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
						setNotes={setNotes}
					/>
				)}
			</AnimatePresence>

			{!isNoteMaximized && (
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
								<ul className="overflow-y-auto">
									{noteElements && noteElements.length > 0 ? (
										noteElements
									) : (
										<li className="text-center text-xs text-zinc-500  dark:text-zinc-300">
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
