import { motion, useSpring } from "framer-motion";
import { CSSProperties, useEffect, useState } from "react";
import { GetFolderNames } from "../../../wailsjs/go/main/App";
import { Folder } from "../../icons/folder";
import { FolderPlus } from "../../icons/folder-plus";
import { cn } from "../../utils/tailwind";
import { MotionButton } from "../button";
import { Spacer } from "./spacer";
import { Dialog } from "../dialog";
import { getDefaultButtonVariants } from "../../variants";

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
			.catch((err) => setFolders(null));
	}, []);

	const folderElements = folders?.map((folderName) => {
		return (
			<li className="flex gap-2 items-center pl-3">
				<Folder /> <p>{folderName}</p>
			</li>
		);
	});

	return (
		<>
			<Dialog
				title="Create Folder"
				isOpen={isFolderDialogOpen}
				setIsOpen={setIsFolderDialogOpen}
			>
				<div className="flex flex-col">
					<label className="pb-2 cursor-pointer" htmlFor="folder-name">
						Folder Name
					</label>
					<input
						placeholder="My To Do's"
						className="py-1 px-2 rounded-sm border-[1px] border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-colors w-full"
						id="folder-name"
						type="text"
					/>
					<MotionButton
						{...getDefaultButtonVariants()}
						className="w-[calc(100%-1rem)] mt-4 mx-auto text-center flex items-center gap-2 justify-center flex-wrap"
					>
						Add Folder <FolderPlus />
					</MotionButton>
				</div>
			</Dialog>
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
