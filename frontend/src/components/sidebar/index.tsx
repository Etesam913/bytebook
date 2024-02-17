import { motion, useSpring } from "framer-motion";
import { CSSProperties, useEffect, useState } from "react";
import { GetFolderNames } from "../../../wailsjs/go/main/App";
import { Folder } from "../../icons/folder";
import { FolderPlus } from "../../icons/folder-plus";
import { cn } from "../../utils/tailwind";
import { MotionButton } from "../button";
import { Spacer } from "./spacer";

export function Sidebar() {
	const [folders, setFolders] = useState<string[] | null>([]);

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
						whileHover={{ scale: 1.035 }}
						whileTap={{ scale: 0.965 }}
						whileFocus={{ scale: 1.035 }}
						className="w-full bg-transparent flex justify-between align-center"
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
