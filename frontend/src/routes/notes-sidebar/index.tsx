import { AnimatePresence, type MotionValue, motion } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { type CSSProperties, useEffect, useState } from "react";
import { Link } from "wouter";
import {
	isFolderDialogOpenAtom,
	isNoteMaximizedAtom,
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
import { cn } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { NotesSidebarDialog } from "./sidebar-dialog";
import { useWailsEvent } from "../../utils/hooks.tsx";
import { DeleteFolder } from "../../../bindings/main/FolderService.ts";
import { navigate } from "wouter/use-browser-location";

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
				}
			}
		});
	});

	const noteElements = notes?.map((noteName) => (
		<li key={noteName}>
			<div
				className="flex items-center gap-2 overflow-hidden pr-1 select-none"
				style={
					{
						"--custom-contextmenu": "note-context-menu",
						"--custom-contextmenu-data": noteName,
					} as CSSProperties
				}
			>
				<Link
					className={cn(
						"flex flex-1 gap-2 items-center px-3 py-[0.45rem] mb-[0.15rem] rounded-md overflow-auto",
						noteName === note && "bg-zinc-100 dark:bg-zinc-700",
					)}
					to={`/${encodeURI(folder)}/${encodeURI(noteName)}`}
				>
					<Note className="min-w-[1.25rem]" />{" "}
					<p className="whitespace-nowrap text-ellipsis overflow-hidden">
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
						className="pt-[0.75rem] text-md h-screen flex flex-col gap-2 overflow-y-auto"
					>
						<div className="pl-1 pr-2.5 pt-[1px] flex flex-col gap-4 h-full overflow-y-auto">
							<section className="flex gap-2 items-center">
								<Folder className="min-w-[1.25rem]" />{" "}
								<p className="whitespace-nowrap text-ellipsis overflow-hidden">
									{folder}
								</p>
								<motion.button
									type="button"
									data-testid="rename_folder_button"
									{...getDefaultButtonVariants(false, 1.15, 0.95, 1.15)}
									className="min-w-[1.5rem] p-[2.5px] rounded-[0.5rem] flex item-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors duration-300"
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
								{...getDefaultButtonVariants()}
								onClick={() => setIsNoteDialogOpen(true)}
								className="w-full bg-transparent flex justify-between align-center"
							>
								Create Note <Compose />
							</MotionButton>
							<section className="flex flex-col flex-1 gap-2 overflow-y-auto">
								<p className="py-1 px-1.5">
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
										<li className="text-center text-zinc-500 dark:text-zinc-300  text-xs">
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
