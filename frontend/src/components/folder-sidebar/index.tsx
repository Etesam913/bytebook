import { AnimatePresence, MotionValue, delay, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { navigate } from "wouter/use-browser-location";
import {
	DeleteFolder,
	GetFolderNames,
	SyncChangesWithRepo,
} from "../../../wailsjs/go/main/App";
import { FileRefresh } from "../../icons/file-refresh";
import { Folder } from "../../icons/folder";
import { FolderPlus } from "../../icons/folder-plus";
import { Trash } from "../../icons/trash";
import { cn } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { MotionButton } from "../button";
import { FolderSidebarDialog } from "./sidebar-dialog";
import { Spacer } from "./spacer";
import { toast } from "sonner";
import { Loader } from "../../icons/loader";

export function FolderSidebar({ width }: { width: MotionValue<number> }) {
	const [, params] = useRoute("/:folder/:note?");

	const folder = params?.folder;

	const [folders, setFolders] = useState<string[] | null>([]);
	const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);

	useEffect(() => {
		GetFolderNames()
			.then((folders) => setFolders(folders))
			.catch((e) => {
				console.error(e);
				setFolders(null);
			});
	}, []);

	const folderElements = folders?.map((folderName) => (
		<li key={folderName}>
			<div className="flex items-center gap-2 overflow-hidden pr-1">
				<Link
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
				<motion.button
					onClick={() =>
						DeleteFolder(`${folderName}`).then(() => {
							const newFolders = folders.filter((v) => v !== folderName);
							navigate(folders.length > 1 ? `/${newFolders[0]}` : "/");
							setFolders(newFolders);
						})
					}
					{...getDefaultButtonVariants(false, 1.1, 0.9, 1.1)}
					type="button"
					className="min-w-[28px] p-1 rounded-[0.3rem] flex item-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700"
				>
					<Trash />
				</motion.button>
			</div>
		</li>
	));

	return (
		<>
			<AnimatePresence>
				{isFolderDialogOpen && (
					<FolderSidebarDialog
						isFolderDialogOpen={isFolderDialogOpen}
						setIsFolderDialogOpen={setIsFolderDialogOpen}
						setFolders={setFolders}
					/>
				)}
			</AnimatePresence>

			<motion.aside
				style={{ width }}
				className="pt-3 text-md h-screen flex flex-col gap-2 overflow-y-auto"
			>
				<div className="px-[10px] flex flex-col gap-4 h-full">
					<MotionButton
						{...getDefaultButtonVariants()}
						className="w-full bg-transparent flex justify-between align-center"
						onClick={() => setIsFolderDialogOpen(true)}
					>
						Create Folder <FolderPlus />
					</MotionButton>
					<section className="flex-1 overflow-y-auto flex flex-col gap-2">
						<p>Your Folders</p>
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
						<MotionButton
							{...getDefaultButtonVariants(isSyncing)}
							onClick={() => {
								setIsSyncing(true);
								SyncChangesWithRepo().then(() => {
									setTimeout(() => {
										setIsSyncing(false);
										toast.success("Successfully Synced Changes.", {
											position: "bottom-right",
										});
									}, 1000);
								});
							}}
							disabled={isSyncing}
							className={cn(
								"w-full bg-transparent flex justify-between align-center",
								isSyncing && "justify-center",
							)}
						>
							{isSyncing ? (
								<Loader />
							) : (
								<>
									Sync Changes <FileRefresh />
								</>
							)}
						</MotionButton>
					</section>
				</div>
			</motion.aside>
			<Spacer width={width} />
		</>
	);
}
