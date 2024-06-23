import { Events } from "@wailsio/runtime";
import { type MotionValue, motion } from "framer-motion";
import { useAtom, useSetAtom } from "jotai";
import {
	type Dispatch,
	type FormEvent,
	type SetStateAction,
	useEffect,
} from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";
import { navigate } from "wouter/use-browser-location";
import {
	AddFolder,
	DeleteFolder,
	RenameFolder,
} from "../../../bindings/github.com/etesam913/bytebook/folderservice.ts";
import { AddNoteToFolder } from "../../../bindings/github.com/etesam913/bytebook/noteservice.ts";
import { WINDOW_ID } from "../../App.tsx";
import { getDefaultButtonVariants } from "../../animations.ts";
import { dialogDataAtom, foldersAtom, selectionRangeAtom } from "../../atoms";
import { FolderPlus } from "../../icons/folder-plus";
import { FolderXMark } from "../../icons/folder-xmark.tsx";
import { Gear } from "../../icons/gear.tsx";
import { Pen } from "../../icons/pen.tsx";
import type { DialogDataType } from "../../types.ts";
import { updateFolders } from "../../utils/fetch-functions";
import { useWailsEvent } from "../../utils/hooks.tsx";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/misc.ts";
import { validateName } from "../../utils/string-formatting.ts";
import { MotionButton, MotionIconButton } from "../buttons";
import { DialogErrorText, resetDialogState } from "../dialog/index.tsx";
import { Input } from "../input/index.tsx";
import { BottomItems } from "./bottom-items.tsx";
import { MyFoldersAccordion } from "./my-folders-accordion.tsx";
import { RecentNotesAccordion } from "./recent-notes-accordion.tsx";
import { Spacer } from "./spacer";

export function FolderDialogChildren({
	errorText,
	action,
	folderToBeRenamed,
}: {
	errorText: string;
	action: "create" | "rename";
	folderToBeRenamed?: string;
}) {
	return (
		<>
			<fieldset className="flex flex-col">
				<Input
					label="New Folder Name"
					labelProps={{ htmlFor: "folder-name" }}
					inputProps={{
						id: "folder-name",
						name: "folder-name",
						placeholder: "My Todos",
						autoFocus: true,
						defaultValue: action === "rename" ? folderToBeRenamed : "",
					}}
				/>
				<DialogErrorText errorText={errorText} />
			</fieldset>
			<MotionButton
				{...getDefaultButtonVariants(false, 1.05, 0.95, 1.05)}
				className="w-[calc(100%-1.5rem)] mx-auto justify-center"
				type="submit"
			>
				<span>{action === "create" ? "Create" : "Rename"} Folder</span>{" "}
				{action === "create" ? <FolderPlus /> : <Pen />}
			</MotionButton>
		</>
	);
}

export async function onFolderDialogSubmit(
	e: FormEvent<HTMLFormElement>,
	setErrorText: Dispatch<SetStateAction<string>>,
	setDialogData: Dispatch<SetStateAction<DialogDataType>>,
	action: "create" | "rename",
	folderToBeRenamed?: string,
) {
	const formData = new FormData(e.target as HTMLFormElement);
	try {
		const newFolderName = formData.get("folder-name");
		const { isValid, errorMessage } = validateName(newFolderName, "folder");
		if (!isValid) throw new Error(errorMessage);
		if (newFolderName) {
			const newFolderNameString = newFolderName.toString().trim();
			if (action === "create") {
				const res = await AddFolder(newFolderNameString);
				if (!res.success) throw new Error(res.message);

				// Add an untitled note
				const addNoteRes = await AddNoteToFolder(
					newFolderNameString,
					"Untitled",
				);
				if (addNoteRes.success)
					navigate(`/${encodeURIComponent(newFolderNameString)}/Untitled`);
				else throw new Error(addNoteRes.message);

				toast.success(
					`Folder, "${newFolderNameString}", successfully created.`,
					DEFAULT_SONNER_OPTIONS,
				);
			} else if (action === "rename") {
				if (!folderToBeRenamed) throw new Error("Something went wrong");
				const res = await RenameFolder(folderToBeRenamed, newFolderNameString);
				if (!res.success) throw new Error(res.message);
				navigate(`/${encodeURIComponent(newFolderNameString)}`);
			}
			resetDialogState(setErrorText, setDialogData);
		}
	} catch (e) {
		if (e instanceof Error) setErrorText(e.message);
		else setErrorText("An unknown error occurred. Please try again later.");
	}
}

export function FolderSidebar({ width }: { width: MotionValue<number> }) {
	const [, params] = useRoute("/:folder/:note?");
	const folder = params?.folder;
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
	const setDialogData = useSetAtom(dialogDataAtom);
	const setFolders = useSetAtom(foldersAtom);

	useWailsEvent("folder:create", (body) => {
		const data = body.data as { folder: string };
		setFolders((prev) => (prev ? [...prev, data.folder] : [data.folder]));
	});

	useWailsEvent("folder:rename", (body) => {
		const data = body.data as { folder: string };
		setFolders((prev) => {
			if (prev) {
				const newFolders = prev.filter((folder) => folder !== data.folder);
				return newFolders;
			}
			return [];
		});
	});

	useWailsEvent("folder:delete", (body) => {
		const data = body.data as { folder: string };
		setFolders((prev) => {
			if (prev) {
				const newFolders = prev.filter((folder) => folder !== data.folder);
				if (newFolders.length > 0) {
					navigate(`/${encodeURIComponent(newFolders[0])}`);
				} else {
					navigate("/");
				}
				return newFolders;
			}
			navigate("/");
			return [];
		});
	});

	useWailsEvent("folder:open-in-new-window", () => {
		for (const selectedFolder of selectionRange) {
			Events.Emit({
				name: "open-note-in-new-window-backend",
				data: { url: `/${selectedFolder}` },
			});
		}
		setSelectionRange(new Set());
	});

	useWailsEvent("folder:context-menu:delete", (body) => {
		const [folderName, windowId] = (body.data as string).split(",");

		if (windowId === WINDOW_ID) {
			setDialogData({
				isOpen: true,
				title: "Delete Folder",
				children: (errorText) => (
					<>
						<fieldset>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								Are you sure you want to{" "}
								<span className="text-red-500">delete "{folderName}"</span> and
								sent its notes to the trash bin?
							</p>
							<DialogErrorText errorText={errorText} />
						</fieldset>
						<MotionButton
							type="submit"
							{...getDefaultButtonVariants()}
							className="w-[calc(100%-1.5rem)] mx-auto justify-center"
						>
							<FolderXMark /> <span>Delete Folder</span>
						</MotionButton>
					</>
				),
				onSubmit: async (_, setErrorText) => {
					try {
						const res = await DeleteFolder(folderName);
						if (!res.success) throw new Error(res.message);
						resetDialogState(setErrorText, setDialogData);
					} catch (e) {
						if (e instanceof Error) setErrorText(e.message);
					}
				},
			});
		}
	});

	useWailsEvent("folder:context-menu:rename", (event) => {
		const [folderToBeRenamed, windowId] = (event.data as string).split(",");
		if (windowId === WINDOW_ID) {
			setDialogData({
				isOpen: true,
				title: "Rename Folder",
				children: (errorText) => (
					<FolderDialogChildren
						errorText={errorText}
						action="rename"
						folderToBeRenamed={folderToBeRenamed}
					/>
				),
				onSubmit: (e, setErrorText) => {
					onFolderDialogSubmit(
						e,
						setErrorText,
						setDialogData,
						"rename",
						folderToBeRenamed,
					);
				},
			});
		}
	});

	// Initially fetches folders from filesystem
	useEffect(() => {
		updateFolders(setFolders);
	}, [setFolders]);

	if (folder === "settings") return null;

	return (
		<>
			<motion.aside
				style={{ width }}
				className="text-md flex h-screen flex-col px-[10px]"
			>
				<div className="min-h-[3.625rem] flex gap-0.5 justify-end items-center">
					{/* <MotionIconButton
						{...getDefaultButtonVariants()}
						title="Go Back"
						onClick={() => window.history.back()}
					>
						<CircleArrowLeft title="Go Back" />
					</MotionIconButton>

					<MotionIconButton
						onClick={() => window.history.forward()}
						{...getDefaultButtonVariants()}
						title="Go Forward"
					>
						<CircleArrowRight title="Go Forward" />
					</MotionIconButton> */}
					<Link to="/settings">
						<MotionIconButton {...getDefaultButtonVariants()} title="Settings">
							<Gear title="Settings" />
						</MotionIconButton>
					</Link>
				</div>
				<MotionButton
					{...getDefaultButtonVariants(false, 1.05, 0.95, 1.05)}
					className="align-center mb-2 flex w-full justify-between bg-transparent"
					onClick={() =>
						setDialogData({
							isOpen: true,
							title: "Create Folder",
							children: (errorText) => (
								<FolderDialogChildren errorText={errorText} action="create" />
							),
							onSubmit: async (e, setErrorText) =>
								onFolderDialogSubmit(e, setErrorText, setDialogData, "create"),
						})
					}
				>
					Create Folder <FolderPlus />
				</MotionButton>
				<section className="flex flex-1 flex-col gap-2 overflow-y-auto">
					<div className="flex h-full flex-col overflow-y-auto gap-1.5">
						<RecentNotesAccordion />
						<MyFoldersAccordion folder={folder} />
						<BottomItems />
					</div>
				</section>
			</motion.aside>
			<Spacer width={width} />
		</>
	);
}
