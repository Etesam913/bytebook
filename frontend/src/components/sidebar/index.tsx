import { AnimatePresence, motion, useSpring } from "framer-motion";
import { CSSProperties, useEffect, useState } from "react";
import { GetFolderNames } from "../../../wailsjs/go/main/App";
import { Folder } from "../../icons/folder";
import { FolderPlus } from "../../icons/folder-plus";
import { cn } from "../../utils/tailwind";
import { MotionButton } from "../button";
import { Spacer } from "./spacer";
import { getDefaultButtonVariants } from "../../variants";
import { SidebarDialog } from "./sidebar-dialog";

export function Sidebar() {
	const [folders, setFolders] = useState<string[] | null>([]);

	const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);

	const sidebarWidth = useSpring(160, {
		damping: 14,
		stiffness: 100,
		mass: 0.8,
	});

	useEffect(() => {
		GetFolderNames()
			.then((folders) => setFolders(folders))
			.catch(() => setFolders(null));
	}, []);

	const folderElements = folders?.map((folderName) => {
		return (
			<li key={folderName} className="flex gap-2 items-center pl-3 pb-2">
				<Folder className="min-w-[1.25rem]" />{" "}
				<p className="whitespace-nowrap text-ellipsis overflow-hidden">
					{folderName}
				</p>
			</li>
		);
	});

	return (
		<>
			<AnimatePresence>
				{isFolderDialogOpen && (
					<SidebarDialog
						isFolderDialogOpen={isFolderDialogOpen}
						setIsFolderDialogOpen={setIsFolderDialogOpen}
					/>
				)}
			</AnimatePresence>

			<motion.aside
				style={{ width: sidebarWidth }}
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
						Add Folder <FolderPlus />
					</MotionButton>
					<section className="flex flex-col gap-3">
						<p>Your Folders</p>
						<ul>
							{folderElements ?? (
								<li className="text-center text-zinc-500 dark:text-zinc-300  text-xs">
									Create a folder with the "Add Folder" button above
								</li>
							)}
						</ul>
					</section>
				</div>
			</motion.aside>
			<Spacer sidebarWidth={sidebarWidth} />
		</>
	);
}
