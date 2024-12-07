import { type MotionValue, motion } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { AddNoteToFolder } from "../../../bindings//github.com/etesam913/bytebook/noteservice.ts";
import { getDefaultButtonVariants } from "../../animations.ts";
import {
	dialogDataAtom,
	isNoteMaximizedAtom,
	noteSortAtom,
	notesAtom,
	selectionRangeAtom,
} from "../../atoms";
import { MotionButton, MotionIconButton } from "../../components/buttons";
import { DialogErrorText } from "../../components/dialog/index.tsx";
import { FolderDialogChildren } from "../../components/folder-sidebar/folder-dialog-children.tsx";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { Input } from "../../components/input/index.tsx";
import { useFolderDialogSubmit } from "../../hooks/folder-events.tsx";
import {
	useNoteCreate,
	useNoteDelete,
	useNoteOpenInNewWindow,
} from "../../hooks/note-events.tsx";
import { Compose } from "../../icons/compose";
import { Folder } from "../../icons/folder";
import { Pen } from "../../icons/pen";
import { checkIfNoteExists, updateNotes } from "../../utils/fetch-functions";
import { useSearchParamsEntries } from "../../utils/hooks.tsx";
import { useCustomNavigate } from "../../utils/routing.ts";
import { validateName } from "../../utils/string-formatting.ts";
import { MyNotesAccordion } from "./my-notes-accordion.tsx";
import { RenderNote } from "./render-note.tsx";

export function NotesSidebar({
	params,
	width,
	leftWidth,
}: {
	params: { folder: string; note?: string };
	width: MotionValue<number>;
	leftWidth: MotionValue<number>;
}) {
	// These are encoded params
	const { folder, note } = params;
	const setDialogData = useSetAtom(dialogDataAtom);
	const [notes, setNotes] = useAtom(notesAtom);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const searchParams: { ext?: string } = useSearchParamsEntries();
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
	const noteSort = useAtomValue(noteSortAtom);
	const sidebarRef = useRef<HTMLElement>(null);
	const { mutateAsync: folderDialogSubmit } = useFolderDialogSubmit();
	// If the fileExtension is undefined, then it is a markdown file
	const fileExtension = searchParams?.ext;
	const { navigate } = useCustomNavigate();
	useEffect(() => {
		updateNotes(folder, note, setNotes, noteSort);
	}, [folder, noteSort]);

	// Navigates to not-found page if note does not exist
	useEffect(() => {
		checkIfNoteExists(folder, note, notes, searchParams?.ext);
	}, [notes, note]);

	useNoteCreate(folder, notes ?? [], setNotes);
	useNoteDelete(folder, note, setNotes);
	useNoteOpenInNewWindow(folder, selectionRange, setSelectionRange);

	return (
		<>
			{!isNoteMaximized && (
				<>
					<motion.aside
						ref={sidebarRef}
						style={{ width }}
						className="text-md flex h-screen flex-col  pb-3.5"
					>
						<div className="flex h-full flex-col overflow-y-auto pl-1.5 pr-2.5 relative">
							<section className="flex items-center min-h-[3.625rem] gap-2">
								<Folder className="min-w-[1.25rem]" width={20} height={20} />{" "}
								<p className="overflow-hidden text-ellipsis whitespace-nowrap">
									{decodeURIComponent(folder)}
								</p>
								<MotionIconButton
									{...getDefaultButtonVariants()}
									onClick={() =>
										setDialogData({
											isOpen: true,
											title: "Rename Folder",
											children: (errorText) => (
												<FolderDialogChildren
													errorText={errorText}
													action="rename"
													folderName={decodeURIComponent(folder)}
												/>
											),
											onSubmit: (e, setErrorText) =>
												folderDialogSubmit({
													e,
													setErrorText,
													action: "rename",
													folderFromSidebar: decodeURIComponent(folder),
												}),
										})
									}
								>
									<Pen className="w-full" />
								</MotionIconButton>
							</section>
							<MotionButton
								{...getDefaultButtonVariants(false, 1.025, 0.975, 1.025)}
								onClick={() =>
									setDialogData({
										isOpen: true,
										title: "Create Note",
										children: (errorText) => (
											<>
												<fieldset className="flex flex-col">
													<Input
														label="New Note Name"
														labelProps={{ htmlFor: "note-name" }}
														inputProps={{
															id: "note-name",
															name: "note-name",
															placeholder: "Today's Tasks",
															autoFocus: true,
														}}
													/>
													<DialogErrorText errorText={errorText} />
												</fieldset>
												<MotionButton
													{...getDefaultButtonVariants(false, 1.05, 0.95, 1.05)}
													className="w-[calc(100%-1.5rem)] mx-auto justify-center"
													type="submit"
												>
													<span>Create Note</span> <Compose />
												</MotionButton>
											</>
										),
										onSubmit: async (e, setErrorText) => {
											const formData = new FormData(
												e.target as HTMLFormElement,
											);
											try {
												const newNoteName = formData.get("note-name");
												const { isValid, errorMessage } = validateName(
													newNoteName,
													"note",
												);
												if (!isValid) throw new Error(errorMessage);
												if (newNoteName) {
													const newNoteNameString = newNoteName
														.toString()
														.trim();
													const res = await AddNoteToFolder(
														decodeURIComponent(folder),
														newNoteNameString,
													);
													if (!res.success) throw new Error(res.message);

													navigate(
														`/${decodeURIComponent(
															folder,
														)}/${newNoteNameString}?ext=md`,
													);
													return true;
												}
												return false;
											} catch (e) {
												if (e instanceof Error) {
													setErrorText(e.message);
												} else {
													setErrorText("An unknown error occurred");
												}
												return false;
											}
										},
									})
								}
								className="align-center flex w-full justify-between bg-transparent mb-2"
							>
								Create Note <Compose className="will-change-transform" />
							</MotionButton>
							<section className="flex flex-col gap-2 overflow-y-auto flex-1">
								<div className="flex h-full flex-col overflow-y-auto">
									<MyNotesAccordion
										notes={notes}
										noteCount={(notes ?? []).length}
										curFolder={folder}
										curNote={note}
									/>
								</div>
							</section>
						</div>
					</motion.aside>
					<Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
				</>
			)}

			<RenderNote folder={folder} note={note} fileExtension={fileExtension} />
		</>
	);
}
