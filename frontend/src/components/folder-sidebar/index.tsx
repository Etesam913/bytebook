import { AnimatePresence, type MotionValue, motion } from "framer-motion";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { WINDOW_ID } from "../../App.tsx";
import { foldersAtom, isFolderDialogOpenAtom } from "../../atoms";
import { FolderPlus } from "../../icons/folder-plus";
import { Gear } from "../../icons/gear.tsx";
import { updateFolders } from "../../utils/fetch-functions";
import { useWailsEvent } from "../../utils/hooks.tsx";
import { getDefaultButtonVariants } from "../../variants";
import { MotionButton } from "../buttons";
import { SyncChangesButton } from "../buttons/sync-changes";
import { MyFoldersAccordion } from "./my-folders-accordion.tsx";
import { RecentNotesAccordion } from "./recent-notes-accordion.tsx";
import { FolderSidebarDialog } from "./sidebar-dialog";
import { Spacer } from "./spacer";

export function FolderSidebar({ width }: { width: MotionValue<number> }) {
	const [, params] = useRoute("/:folder/:note?");
	const folder = params?.folder;

	const [isFolderDialogOpen, setIsFolderDialogOpen] = useAtom(
		isFolderDialogOpenAtom,
	);
	const [folders, setFolders] = useAtom(foldersAtom);
	const [isSyncing, setIsSyncing] = useState(false);

	useWailsEvent("delete-folder", (event) => {
		const [folderName, windowId] = (event.data as string).split(",");
		if (windowId === WINDOW_ID) {
			setIsFolderDialogOpen({
				isOpen: true,
				action: "delete",
				folderName,
			});
		}
	});

	useWailsEvent("rename-folder", (event) => {
		const [folderName, windowId] = (event.data as string).split(",");
		if (windowId === WINDOW_ID) {
			setIsFolderDialogOpen({
				isOpen: true,
				action: "rename",
				folderName,
			});
		}
	});

	// useWailsEvent("create-note", () => {
	// 	// setIsFolderDialogOpen({ isOpen: true, action: "create" });
	// });

	// Initially fetches folders from filesystem
	useEffect(() => {
		updateFolders(setFolders);
	}, [setFolders]);

	// Updates the folders state when folders is changed
	useWailsEvent("folders:changed", (body) => {
		const data = body.data as { windowId: string; folders: string[] | null };
		if (folder && data.folders) {
			if (!data.folders.includes(folder)) {
				const firstFolder = data.folders.at(0);
				const newUrl = firstFolder ? `/${firstFolder}` : "/";
				navigate(newUrl);
			}
		}
		setFolders(data.folders);
	});

	return (
		<>
			<AnimatePresence>
				{isFolderDialogOpen.isOpen && (
					<FolderSidebarDialog
						isFolderDialogOpen={isFolderDialogOpen}
						setIsFolderDialogOpen={setIsFolderDialogOpen}
						folders={folders ?? []}
					/>
				)}
			</AnimatePresence>
			<motion.aside
				style={{ width }}
				className="text-md flex h-screen flex-col px-[10px]"
			>
				<div className="h-[3.625rem] flex flex-col justify-center">
					<MotionButton
						{...getDefaultButtonVariants()}
						title="Settings"
						className="transition-colors ml-auto !bg-transparent border-0 p-1.5 hover:!bg-zinc-100 dark:hover:!bg-zinc-700 rounded-md"
					>
						<Gear title="Settings" />
					</MotionButton>
				</div>
				<div className="flex h-full flex-col gap-2">
					<MotionButton
						{...getDefaultButtonVariants(false, 1.05, 0.95, 1.05)}
						data-testid="create_folder_button"
						className="align-center mb-2 flex w-full justify-between bg-transparent"
						onClick={() =>
							setIsFolderDialogOpen({
								isOpen: true,
								action: "create",
								folderName: "",
							})
						}
					>
						Create Folder <FolderPlus />
					</MotionButton>
					<RecentNotesAccordion />
					<MyFoldersAccordion folder={folder} />
					<section className="mt-auto pb-3">
						<SyncChangesButton
							isSyncing={isSyncing}
							setIsSyncing={setIsSyncing}
						/>
					</section>
				</div>
			</motion.aside>
			<Spacer width={width} />
		</>
	);
}
