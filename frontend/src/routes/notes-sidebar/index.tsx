import { Events } from "@wailsio/runtime";
import { type MotionValue, motion } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { navigate } from "wouter/use-browser-location";
import {
	AddNoteToFolder,
	MoveToTrash,
} from "../../../bindings//github.com/etesam913/bytebook/noteservice.ts";
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
import { Compose } from "../../icons/compose";
import { Folder } from "../../icons/folder";
import { Pen } from "../../icons/pen";
import { updateNotes } from "../../utils/fetch-functions";
import { useSearchParamsEntries, useWailsEvent } from "../../utils/hooks.tsx";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/misc.ts";
import {
	extractInfoFromNoteName,
	validateName,
} from "../../utils/string-formatting.ts";
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
	}, [folder, setNotes]);

	useWailsEvent("note:create", (body) => {
		const data = body.data as { folder: string; note: string };
		// Windows that are on a different folder should not navigate to this new url
		if (data.folder !== decodeURIComponent(folder)) return;
		// const { noteNameWithoutExtension, queryParams } = extractInfoFromNoteName(
		// 	data.note,
		// );

		setNotes((prev) => (prev ? [...prev, data.note] : [data.note]));
		// Need to only do this when a note is created with the ui
		// navigate(
		// 	`/${folder}/${encodeURIComponent(noteNameWithoutExtension)}?ext=${
		// 		queryParams.ext
		// 	}`,
		// );
	});

	useWailsEvent("note:delete", (body) => {
		const data = body.data as { folder: string; note: string };
		if (data.folder !== decodeURIComponent(folder)) return;
		setNotes((prev) => {
			const newNotes = prev ? prev.filter((v) => v !== data.note) : [data.note];
			// The note that you are on is deleted

			if (
				note &&
				`${decodeURIComponent(note)}?ext=${fileExtension}` === data.note
			) {
				if (newNotes.length > 0) {
					navigate(`/${folder}/${newNotes[0]}`);
				} else {
					navigate(`/${folder}`);
				}
			}
			return newNotes;
		});
	});

	useWailsEvent("note:context-menu:delete", async (event) => {
		const noteNamesAsString = event.data as string;
		// TODO: This has to be done in a better way because a note name can have a comma in it
		const noteNamesAsArray = noteNamesAsString.split(",");

		const paths = noteNamesAsArray.map((noteName) => {
			const { noteNameWithoutExtension, queryParams } =
				extractInfoFromNoteName(noteName);

			return `/${folder}/${noteNameWithoutExtension}.${queryParams.ext}`;
		});

		try {
			const res = await MoveToTrash(paths);
			if (res.success) {
				toast.success(res.message, DEFAULT_SONNER_OPTIONS);
			} else {
				throw new Error(res.message);
			}
		} catch (err: unknown) {
			if (err instanceof Error) {
				toast.error(err.message);
			} else {
				toast.error("An Unknown Error Occurred");
			}
		}
		setSelectionRange(new Set());
	});

	useWailsEvent("note:open-in-new-window", () => {
		for (const noteNameWithQueryParam of selectionRange) {
			Events.Emit({
				name: "open-note-in-new-window-backend",
				data: { url: `/${folder}/${noteNameWithQueryParam}` },
			});
		}
		setSelectionRange(new Set());
	});

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
														{
															dismissible: true,
															duration: 2000,
															closeButton: true,
														},
													);
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
									<MyNotesAccordion notes={notes} />
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
