import { CSSProperties } from "react";

export function Sidebar() {
	return (
		<aside className=" text-md w-40 h-screen border-r-[1px] border-r-zinc-200 dark:border-r-zinc-700 flex flex-col gap-2">
			<div
				className="h-9 cursor-grab active:cursor-grabbing"
				style={{ "--wails-draggable": "drag" } as CSSProperties}
			/>
			<div className="px-[11px]">sidebar</div>
		</aside>
	);
}
