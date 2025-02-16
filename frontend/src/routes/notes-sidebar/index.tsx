import { type MotionValue, motion } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useRef } from "react";
import { AddNoteToFolder } from "../../../bindings/github.com/etesam913/bytebook/noteservice";
import { getDefaultButtonVariants } from "../../animations.ts";
import {
	dialogDataAtom,
	isNoteMaximizedAtom,
	selectionRangeAtom,
} from "../../atoms";
import { MotionButton, MotionIconButton } from "../../components/buttons";
import { DialogErrorText } from "../../components/dialog/index.tsx";
import { FolderDialogChildren } from "../../components/folder-sidebar/folder-dialog-children.tsx";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { Input } from "../../components/input/index.tsx";
import { useFolderDialogSubmit } from "../../hooks/folders.tsx";
import {
	useNoteCreate,
	useNoteDelete,
	useNoteOpenInNewWindow,
	useNotes,
} from "../../hooks/notes.tsx";
import { Compose } from "../../icons/compose";
import { Folder } from "../../icons/folder";
import { Pen } from "../../icons/pen";
import { useSearchParamsEntries } from "../../utils/routing";
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
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
	const sidebarRef = useRef<HTMLElement>(null);
	const { mutateAsync: folderDialogSubmit } = useFolderDialogSubmit();
	const searchParams: { ext?: string } = useSearchParamsEntries();
	// If the fileExtension is undefined, then it is a markdown file
	const fileExtension = searchParams?.ext;

	const noteQueryResult = useNotes(folder, note, fileExtension);

	useNoteCreate();
	useNoteDelete(folder);
	useNoteOpenInNewWindow(folder, selectionRange, setSelectionRange);
	return (
		<>
			{!isNoteMaximized && (
				<>
					<motion.aside
						ref={sidebarRef}
						style={{ width }}
						className="text-md flex h-screen flex-col pb-3.5"
					>
						<div className="flex h-full flex-col overflow-y-auto relative">
							<header className="pl-1.5 pr-2.5">
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
												isPending: false,
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
											isPending: false,
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
														{...getDefaultButtonVariants(
															false,
															1.05,
															0.95,
															1.05,
														)}
														className="w-[calc(100%-1.5rem)] mx-auto text-center justify-center"
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
							</header>
							<section className="flex flex-col gap-2 overflow-y-auto flex-1">
								<div className="flex h-full flex-col overflow-y-auto">
									<MyNotesAccordion
										layoutId="note-sidebar"
										curFolder={folder}
										curNote={note}
										fileExtension={fileExtension}
										noteQueryResult={noteQueryResult}
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
