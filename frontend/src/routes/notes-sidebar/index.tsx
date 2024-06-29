import { type MotionValue, motion } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { navigate } from "wouter/use-browser-location";
import { AddNoteToFolder } from "../../../bindings//github.com/etesam913/bytebook/noteservice.ts";
import { getDefaultButtonVariants } from "../../animations.ts";
import {
	dialogDataAtom,
	isNoteMaximizedAtom,
	notesAtom,
	selectionRangeAtom,
} from "../../atoms";
import { MotionButton, MotionIconButton } from "../../components/buttons";
import {
	DialogErrorText,
	resetDialogState,
} from "../../components/dialog/index.tsx";
import {
	FolderDialogChildren,
	onFolderDialogSubmit,
} from "../../components/folder-sidebar/index.tsx";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { Input } from "../../components/input/index.tsx";
import {
	useNoteContextMenuDelete,
	useNoteCreate,
	useNoteDelete,
	useNoteOpenInNewWindow,
} from "../../hooks/note-events.tsx";
import { Compose } from "../../icons/compose";
import { Folder } from "../../icons/folder";
import { Pen } from "../../icons/pen";
import { getNoteCount, updateNotes } from "../../utils/fetch-functions";
import { useSearchParamsEntries } from "../../utils/hooks.tsx";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/misc.ts";
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
	const setDialogData = useSetAtom(dialogDataAtom);
	const [noteCount, setNoteCount] = useState(0);
	const [notes, setNotes] = useAtom(notesAtom);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const { folder, note } = params;
	const searchParams: { ext?: string } = useSearchParamsEntries();
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);

	const sidebarRef = useRef<HTMLElement>(null);
	// If the fileExtension is undefined, then it is a markdown file
	const fileExtension = searchParams?.ext;

	useEffect(() => {
		updateNotes(folder, note, setNotes);
		getNoteCount(folder, setNoteCount);
	}, [folder, setNotes]);

	useNoteCreate(folder, notes ?? [], setNotes, setNoteCount);
	useNoteDelete(folder, note, setNotes, setNoteCount, fileExtension);
	useNoteContextMenuDelete(folder, setSelectionRange);
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
								<Folder className="min-w-[1.25rem]" />{" "}
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
													folderToBeRenamed={decodeURIComponent(folder)}
												/>
											),
											onSubmit: (e, setErrorText) => {
												onFolderDialogSubmit(
													e,
													setErrorText,
													setDialogData,
													"rename",
													decodeURIComponent(folder),
												);
											},
										})
									}
								>
									<Pen className="w-full" />
								</MotionIconButton>
							</section>
							<MotionButton
								{...getDefaultButtonVariants(false, 1.05, 0.95, 1.05)}
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
													resetDialogState(setErrorText, setDialogData);
													toast.success(
														`Note, "${newNoteNameString}", successfully created.`,
														DEFAULT_SONNER_OPTIONS,
													);
													navigate(`/${folder}/${newNoteNameString}?ext=md`);
												}
											} catch (e) {
												if (e instanceof Error) {
													setErrorText(e.message);
												} else {
													setErrorText("An unknown error occurred");
												}
											}
										},
									})
								}
								className="align-center flex w-full justify-between bg-transparent mb-2"
							>
								Create Note <Compose />
							</MotionButton>
							<section className="flex flex-col gap-2 overflow-y-auto">
								<div className="flex h-full flex-col overflow-y-auto">
									<MyNotesAccordion notes={notes} noteCount={noteCount} />
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
