import { motion, useSpring } from "framer-motion";
import { cn } from "../utils/tailwind";
import { type CSSProperties } from "react";
import { MotionButton } from "../components/button";
import { getDefaultButtonVariants } from "../variants";
import { Folder } from "../icons/folder";
import { Spacer } from "../components/folder-sidebar/spacer";
import { Compose } from "../icons/compose";

export function NotesSidebar({ params }: { params: { folder: string } }) {
	const { folder } = params;

	const sidebarWidth = useSpring(220, {
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
					className="h-3 cursor-grab active:cursor-grabbing"
					style={{ "--wails-draggable": "drag" } as CSSProperties}
				/>
				<div className="px-[10px] flex flex-col gap-4">
					<section className="flex gap-3">
						<Folder className="min-w-[1.25rem]" />{" "}
						<p className="whitespace-nowrap text-ellipsis overflow-hidden">
							wow
						</p>
					</section>
					<MotionButton
						{...getDefaultButtonVariants()}
						className="w-full bg-transparent flex justify-between align-center"
					>
						Add Note <Compose />
					</MotionButton>
					<section className="flex flex-col gap-3">
						<p>Your Notes</p>
					</section>
				</div>
			</motion.aside>
			{/* <Spacer sidebarWidth={sidebarWidth} /> */}
		</>
	);
}
