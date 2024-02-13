import { CSSProperties, useState } from "react";
import { MotionButton } from "../button";
import { FolderPlus } from "../../icons/folder-plus";
import { Spacer } from "./spacer";
import { motion, useSpring } from "framer-motion";
import { cn } from "../../utils/tailwind";

export function Sidebar() {
	const sidebarWidth = useSpring(160, {
		damping: 14,
		stiffness: 100,
		mass: 0.8,
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
				<div className="px-[10px]">
					<MotionButton
						whileHover={{ scale: 1.035 }}
						whileTap={{ scale: 0.965 }}
						whileFocus={{ scale: 1.035 }}
						className="w-full bg-transparent flex justify-between align-center"
					>
						Add Folder <FolderPlus />
					</MotionButton>
				</div>
			</motion.aside>
			<Spacer sidebarWidth={sidebarWidth} />
		</>
	);
}
