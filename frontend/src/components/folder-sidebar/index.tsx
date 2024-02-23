import { AnimatePresence, MotionValue, motion } from "framer-motion";
import { CSSProperties, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { GetFolderNames } from "../../../wailsjs/go/main/App";
import { Folder } from "../../icons/folder";
import { FolderPlus } from "../../icons/folder-plus";
import { cn } from "../../utils/tailwind";
import { getDefaultButtonVariants } from "../../variants";
import { MotionButton } from "../button";
import { FolderSidebarDialog } from "./sidebar-dialog";
import { Spacer } from "./spacer";

export function FolderSidebar({ width }: { width: MotionValue<number> }) {
	const [, folderParam] = useRoute("/:folder");
	const [, folderAndNoteParam] = useRoute("/:folder/:note");
	console.log(folderParam, folderAndNoteParam);
	const folder = folderParam?.folder ?? folderAndNoteParam?.folder;

	const [folders, setFolders] = useState<string[] | null>([]);
	const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);

	useEffect(() => {
		GetFolderNames()
			.then((folders) => setFolders(folders))
			.catch(() => setFolders(null));
	}, []);

	const folderElements = folders?.map((folderName) => (
		<li key={folderName}>
			<Link
				className={cn(
					"flex gap-2 items-center pl-3 py-[0.45rem] mb-[0.15rem] rounded-md",
					folderName === folder && "bg-zinc-100 dark:bg-zinc-700",
				)}
				to={`/${encodeURI(folderName)}`}
			>
				<Folder className="min-w-[1.25rem]" />{" "}
				<p className="whitespace-nowrap text-ellipsis overflow-hidden">
					{folderName}
				</p>
			</Link>
		</li>
	));

	return (
		<>
			<AnimatePresence>
				{isFolderDialogOpen && (
					<FolderSidebarDialog
						isFolderDialogOpen={isFolderDialogOpen}
						setIsFolderDialogOpen={setIsFolderDialogOpen}
					/>
				)}
			</AnimatePresence>

			<motion.aside
				style={{ width }}
				className={cn("text-md h-screen flex flex-col gap-2")}
			>
				<div
					className="h-9 cursor-grab active:cursor-grabbing"
					style={{ "--wails-draggable": "drag" } as CSSProperties}
				/>
				<div className="px-[10px] flex flex-col gap-4">
					<MotionButton
						{...getDefaultButtonVariants()}
						className="w-full bg-transparent flex justify-between align-center"
						onClick={() => setIsFolderDialogOpen(true)}
					>
						Create Folder <FolderPlus />
					</MotionButton>
					<section className="flex flex-col gap-3">
						<p>Your Folders</p>
						<ul>
							{folderElements ?? (
								<li className="text-center text-zinc-500 dark:text-zinc-300  text-xs">
									Create a folder with the "Create Folder" button above
								</li>
							)}
						</ul>
					</section>
				</div>
			</motion.aside>
			<Spacer width={width} />
		</>
	);
}
