import { type MotionValue, motion } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
	type Dispatch,
	type FormEvent,
	type SetStateAction,
	useEffect,
} from "react";
import { toast } from "sonner";
import { useRoute } from "wouter";
import {
	AddFolder,
	RenameFolder,
} from "../../../bindings/github.com/etesam913/bytebook/folderservice.ts";
import { AddNoteToFolder } from "../../../bindings/github.com/etesam913/bytebook/noteservice.ts";
import { getDefaultButtonVariants } from "../../animations.ts";
import {
	dialogDataAtom,
	foldersAtom,
	selectionRangeAtom,
	tagsAtom,
} from "../../atoms";
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

import { Pen } from "../../icons/pen.tsx";

import type { NavigateFunction } from "../../types.ts";
import {
	checkIfFolderExists,
	updateFolders,
	updateTags,
} from "../../utils/fetch-functions";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/misc.ts";
import { useCustomNavigate } from "../../utils/routing.ts";
import { validateName } from "../../utils/string-formatting.ts";
import { MotionButton } from "../buttons";
import { DialogErrorText } from "../dialog/index.tsx";
import { Input } from "../input/index.tsx";
import { BottomItems } from "./bottom-items.tsx";
import { MyFoldersAccordion } from "./my-folders-accordion.tsx";
import { MyTagsAccordion } from "./my-tags-accordion.tsx";
import { PinnedNotesAccordion } from "./pinned-notes-accordion.tsx";
import { RecentNotesAccordion } from "./recent-notes-accordion.tsx";
import { SearchBar } from "./searchbar.tsx";
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
	navigate: NavigateFunction,
	setErrorText: Dispatch<SetStateAction<string>>,
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
			}
			return true;
		}
		return false;
	} catch (e) {
		if (e instanceof Error) setErrorText(e.message);
		else setErrorText("An unknown error occurred. Please try again later.");
		return false;
	}
}

export function FolderSidebar({ width }: { width: MotionValue<number> }) {
	const [, params] = useRoute("/:folder/:note?");
	const folder = params?.folder;
	const folders = useAtomValue(foldersAtom);
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
	const setDialogData = useSetAtom(dialogDataAtom);
	const setFolders = useSetAtom(foldersAtom);
	const setTags = useSetAtom(tagsAtom);
	const { navigate } = useCustomNavigate();

	useFolderCreate(setFolders);
	useFolderRename(folder, setFolders);
	useFolderDelete(setFolders);
	useFolderOpenInNewWindow(selectionRange, setSelectionRange);
	useFolderContextMenuRename(setDialogData);
	useFolderContextMenuDelete(folder, folders, setDialogData, setSelectionRange);
	useFolderContextMenuFindInFinder(selectionRange, setSelectionRange);

	// Initially fetches folders from filesystem
	useEffect(() => {
		updateFolders(setFolders);
		updateTags(setTags);
	}, [setFolders]);

	// Navigates to not-found page if folder does not exist
	useEffect(() => {
		// trash folder is reserved for the trash notes, it is not a real folder
		if (folder === "trash") return;
		checkIfFolderExists(folder);
	}, [folders, folder]);

	if (folder === "settings") return null;

	return (
		<>
			<motion.aside
				style={{ width }}
				className="text-md flex h-screen flex-col px-[10px] pt-[3.8rem]"
			>
				<SearchBar />
				<MotionButton
					{...getDefaultButtonVariants(false, 1.025, 0.975, 1.025)}
					className="align-center mb-2 flex w-full justify-between bg-transparent"
					onClick={() =>
						setDialogData({
							isOpen: true,
							title: "Create Folder",
							children: (errorText) => (
								<FolderDialogChildren errorText={errorText} action="create" />
							),
							onSubmit: async (e, setErrorText) =>
								onFolderDialogSubmit(e, navigate, setErrorText, "create"),
						})
					}
				>
					Create Folder <FolderPlus className="will-change-transform" />
				</MotionButton>
				<section className="flex flex-1 flex-col gap-2 overflow-y-auto">
					<div className="flex h-full flex-col overflow-y-auto gap-1">
						<PinnedNotesAccordion />
						<RecentNotesAccordion />
						<MyFoldersAccordion folder={folder} />
						<MyTagsAccordion />
						<BottomItems />
					</div>
				</section>
			</motion.aside>
			<Spacer width={width} />
		</>
	);
}
