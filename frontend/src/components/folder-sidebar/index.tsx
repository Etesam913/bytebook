import { AnimatePresence, type MotionValue, motion } from "framer-motion";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { foldersAtom, isFolderDialogOpenAtom } from "../../atoms";
import { FolderPlus } from "../../icons/folder-plus";
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
		const folderName = event.data as string;
		setIsFolderDialogOpen({
			isOpen: true,
			action: "delete",
			folderName,
		});
	});
	useWailsEvent("rename-folder", (event) => {
		const folderName = event.data as string;
		setIsFolderDialogOpen({
			isOpen: true,
			action: "rename",
			folderName,
		});
	});
	useWailsEvent("create-note", () => {
		// setIsFolderDialogOpen({ isOpen: true, action: "create" });
	});

	useEffect(() => {
		updateFolders(setFolders);
	}, [setFolders]);

	return (
		<>
			<AnimatePresence>
				{isFolderDialogOpen.isOpen && (
					<FolderSidebarDialog
						isFolderDialogOpen={isFolderDialogOpen}
						setIsFolderDialogOpen={setIsFolderDialogOpen}
						setFolders={setFolders}
						folders={folders ?? []}
					/>
				)}
			</AnimatePresence>
			<motion.aside
				style={{ width }}
				className="text-md flex h-screen flex-col gap-2 overflow-y-auto"
			>
				test
				<div className="flex h-full flex-col gap-2 px-[10px] pt-[3.5rem]">
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
