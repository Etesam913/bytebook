import { type MotionValue, motion } from "framer-motion";
import { useAtom, useSetAtom } from "jotai";
import { useEffect } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";
import { navigate } from "wouter/use-browser-location";
import {
	AddFolder,
	DeleteFolder,
} from "../../../bindings/github.com/etesam913/bytebook/folderservice.ts";
import { AddNoteToFolder } from "../../../bindings/github.com/etesam913/bytebook/noteservice.ts";
import { WINDOW_ID } from "../../App.tsx";
import { getDefaultButtonVariants } from "../../animations.ts";
import {
	dialogDataAtom,
	foldersAtom,
	isFolderDialogOpenAtom,
} from "../../atoms";
import { CircleArrowLeft } from "../../icons/circle-arrow-left.tsx";
import { CircleArrowRight } from "../../icons/circle-arrow-right.tsx";
import { FolderPlus } from "../../icons/folder-plus";
import { Gear } from "../../icons/gear.tsx";
import { updateFolders } from "../../utils/fetch-functions";
import { useWailsEvent } from "../../utils/hooks.tsx";
import { MotionButton, MotionIconButton } from "../buttons";
import { DialogErrorText, resetDialogState } from "../dialog/new-dialog.tsx";
import { Input } from "../input/index.tsx";
import { BottomItems } from "./bottom-items.tsx";
import { MyFoldersAccordion } from "./my-folders-accordion.tsx";
import { RecentNotesAccordion } from "./recent-notes-accordion.tsx";
import { FolderSidebarDialog } from "./sidebar-dialog";
import { Spacer } from "./spacer";
import { FolderXMark } from "../../icons/folder-xmark.tsx";

const FOLDER_NAME_REGEX = /^[^<>:"/\\|?*\s]+(\s[^<>:"/\\|?*\s]+)*$/;

export function FolderSidebar({ width }: { width: MotionValue<number> }) {
	const [, params] = useRoute("/:folder/:note?");
	const folder = params?.folder;
	const [isFolderDialogOpen, setIsFolderDialogOpen] = useAtom(
		isFolderDialogOpenAtom,
	);

	const setDialogData = useSetAtom(dialogDataAtom);
	const [folders, setFolders] = useAtom(foldersAtom);

	useWailsEvent("folder:create", (body) => {
		const data = body.data as { folder: string };

		AddNoteToFolder(data.folder, "Untitled")
			.then((res) => {
				if (res.success) navigate(`/${data.folder}/Untitled`);
				else throw new Error(res.message);
			})
			.catch((e) => console.error(e));

		setFolders((prev) => (prev ? [...prev, data.folder] : [data.folder]));
	});

	useWailsEvent("folder:delete", (body) => {
		const data = body.data as { folder: string };
		setFolders((prev) => {
			if (prev) {
				const newFolders = prev.filter((folder) => folder !== data.folder);
				if (newFolders.length > 0) {
					navigate(`/${newFolders[0]}`);
				} else {
					navigate("/");
				}
				return newFolders;
			}
			navigate("/");
			return [];
		});
	});

	useWailsEvent("folder:context-menu:delete", (body) => {
		const [folderName, windowId] = (body.data as string).split(",");
		// There's a weird bug with apostrophe that required this replaceAll
		const cleanedWindowId = windowId.trim().replaceAll('"', "");
		if (cleanedWindowId === WINDOW_ID) {
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
		const [folderName, windowId] = (event.data as string).split(",");
		if (windowId === WINDOW_ID) {
			setIsFolderDialogOpen({
				isOpen: true,
				action: "rename",
				folderName,
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
			{/* <AnimatePresence>
				{isFolderDialogOpen.isOpen && (
					<FolderSidebarDialog
						isFolderDialogOpen={isFolderDialogOpen}
						setIsFolderDialogOpen={setIsFolderDialogOpen}
						folders={folders ?? []}
					/>
				)}
			</AnimatePresence> */}
			<motion.aside
				style={{ width }}
				className="text-md flex h-screen flex-col px-[10px]"
			>
				<div className="min-h-[3.625rem] flex gap-0.5 justify-end items-center">
					<MotionIconButton
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
					</MotionIconButton>
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
								<>
									<fieldset className="flex flex-col">
										<Input
											label="New Folder Name"
											labelProps={{ htmlFor: "folder-title" }}
											inputProps={{
												id: "folder-title",
												name: "folder-title",
												placeholder: "My Todos",
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
										<FolderPlus /> <span>Create Folder</span>
									</MotionButton>
								</>
							),
							onSubmit: async (e, setErrorText) => {
								const formData = new FormData(e.target as HTMLFormElement);
								try {
									const folderTitle = formData.get("folder-title");
									if (!folderTitle)
										throw new Error("You cannot have an empty folder title");
									if (folderTitle) {
										const folderTitleString = folderTitle.toString().trim();
										if (folderTitleString.length === 0)
											throw new Error("You cannot have an empty folder title");
										if (!FOLDER_NAME_REGEX.test(folderTitleString)) {
											throw new Error(
												'Invalid folder name. Avoid special characters: <>:"/\\|?* and leading/trailing spaces.',
											);
										}
										const res = await AddFolder(folderTitleString);
										if (!res.success) throw new Error(res.message);
										resetDialogState(setErrorText, setDialogData);
										toast.success(
											`Folder, "${folderTitleString}", successfully created.`,
											{ dismissible: true, duration: 2500 },
										);
									}
								} catch (e) {
									if (e instanceof Error) setErrorText(e.message);
								}
							},
						})
					}
				>
					Create Folder <FolderPlus />
				</MotionButton>
				<section className="flex flex-1 flex-col gap-2 overflow-y-auto">
					<div className="flex h-full flex-col overflow-y-auto z-20 gap-1.5">
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
