import { type MotionValue, motion } from "framer-motion";
import { useAtom, useSetAtom } from "jotai";
import {
	type Dispatch,
	type FormEvent,
	type SetStateAction,
	useEffect,
} from "react";
import { toast } from "sonner";
import { useRoute } from "wouter";
import { navigate } from "wouter/use-browser-location";
import {
	AddFolder,
	RenameFolder,
} from "../../../bindings/github.com/etesam913/bytebook/folderservice.ts";
import { AddNoteToFolder } from "../../../bindings/github.com/etesam913/bytebook/noteservice.ts";

import { getDefaultButtonVariants } from "../../animations.ts";
import { dialogDataAtom, foldersAtom, selectionRangeAtom } from "../../atoms";
import { FolderPlus } from "../../icons/folder-plus";

import {
	useFolderContextMenuDelete,
	useFolderContextMenuFindInFinder,
	useFolderContextMenuRename,
	useFolderCreate,
	useFolderDelete,
	useFolderOpenInNewWindow,
	useFolderRename,
} from "../../hooks/folder-events.tsx";
import { Gear } from "../../icons/gear.tsx";
import { Pen } from "../../icons/pen.tsx";
import { SettingsWindow } from "../../routes/settings/index.tsx";
import type { DialogDataType } from "../../types.ts";
import { updateFolders } from "../../utils/fetch-functions";
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
					navigate(
						`/${encodeURIComponent(newFolderNameString)}/Untitled?ext=md`,
					);
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

	useFolderCreate(setFolders);
	useFolderRename(folder, setFolders);
	useFolderDelete(setFolders);
	useFolderOpenInNewWindow(selectionRange, setSelectionRange);
	useFolderContextMenuRename(setDialogData);
	useFolderContextMenuDelete(setDialogData, setSelectionRange);
	useFolderContextMenuFindInFinder(selectionRange, setSelectionRange);

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
					{/* <Link to="/settings"> */}
					<MotionIconButton
						{...getDefaultButtonVariants()}
						title="Settings"
						onClick={() => {
							setDialogData({
								isOpen: true,
								title: "Settings",
								dialogClassName: "w-[min(55rem,90vw)]",
								children: () => <SettingsWindow />,
								onSubmit: null,
							});
						}}
					>
						<Gear title="Settings" />
					</MotionIconButton>
					{/* </Link> */}
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
