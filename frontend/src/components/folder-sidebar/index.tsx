import { AnimatePresence, type MotionValue, motion } from "framer-motion";
import { useAtom } from "jotai";
import { CSSProperties, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { foldersAtom, isFolderDialogOpenAtom } from "../../atoms";
import { Folder } from "../../icons/folder";
import { FolderPlus } from "../../icons/folder-plus";
import { updateFolders } from "../../utils/fetch-functions";
import { cn } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { MotionButton } from "../buttons";
import { SyncChangesButton } from "../buttons/sync-changes";
import { FolderSidebarDialog } from "./sidebar-dialog";
import { Spacer } from "./spacer";
import { useWailsEvent } from "../../utils/hooks.tsx";

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
			folderName
		});
	});
	useWailsEvent("rename-folder", (event) => {
		const folderName = event.data as string;
		setIsFolderDialogOpen({
			isOpen: true,
			action: "rename",
			folderName
		});
	});
	useWailsEvent("create-note", () => {
		// setIsFolderDialogOpen({ isOpen: true, action: "create" });
	});

	useEffect(() => {
		updateFolders(setFolders);
	}, [setFolders]);

	const folderElements = folders?.map((folderName) => (
		<li key={folderName}>
			<div
				id="folder"
				className="flex items-center gap-2 overflow-hidden pr-1 select-none"
				style={
					{
						"--custom-contextmenu": "folder-context-menu",
						"--custom-contextmenu-data": folderName,
					} as CSSProperties
				}
			>
				<Link
					data-testid={`folder_link-${folderName}`}
					className={cn(
						"flex flex-1 gap-2 items-center px-3 py-[0.45rem] rounded-md overflow-x-hidden",
						folderName === folder && "bg-zinc-100 dark:bg-zinc-700",
					)}
					to={`/${encodeURI(folderName)}`}
				>
					<Folder className="min-w-[1.25rem]" />{" "}
					<p className="whitespace-nowrap text-ellipsis overflow-hidden">
						{folderName}
					</p>
				</Link>
			</div>
		</li>
	));

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
				className="pt-[3.5rem] text-md h-screen flex flex-col gap-2 overflow-y-auto"
			>
				<div className="px-[10px] flex flex-col gap-4 h-full">
					<MotionButton
						{...getDefaultButtonVariants()}
						data-testid="create_folder_button"
						className="w-full bg-transparent flex justify-between align-center"
						onClick={() =>
							setIsFolderDialogOpen({ isOpen: true, action: "create", folderName: ""})
						}
					>
						Create Folder <FolderPlus />
					</MotionButton>
					<section className="flex-1 overflow-y-auto flex flex-col gap-2">
						<p>
							Your Folders{" "}
							{folderElements && folderElements.length > 0 && (
								<span className="tracking-wider">
									({folderElements.length})
								</span>
							)}
						</p>
						<ul className="overflow-y-auto">
							{folderElements && folderElements.length > 0 ? (
								folderElements
							) : (
								<li className="text-center text-zinc-500 dark:text-zinc-300  text-xs">
									Create a folder with the "Create Folder" button above
								</li>
							)}
						</ul>
					</section>
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
