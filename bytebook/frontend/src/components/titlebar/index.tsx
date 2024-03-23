import { CSSProperties } from "react";

export function Titlebar() {
	return (
		<header
			style={{ "--wails-draggable": "drag" } as CSSProperties}
			className="w-full py-1 px-3 h-9 cursor-grab active:cursor-grabbing"
		>
			heading
		</header>
	);
}
