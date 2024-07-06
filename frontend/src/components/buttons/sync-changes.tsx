import { cn } from "../../utils/string-formatting";

import OpenRectArrowIn from "../../icons/open-rect-arrow-in";

// interface SyncButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
// 	isSyncing: boolean;
// 	setIsSyncing: Dispatch<SetStateAction<boolean>>;
// }

export function SyncChangesButton() {
	return (
		<>
			<button
				type="button"
				onClick={() => {
					// Browser.OpenURL("http://localhost:8000/auth/github");
					window.location.href = "http://localhost:8000/auth/github";
				}}
				className={cn(
					"w-full bg-transparent rounded-md flex gap-2 items-center hover:bg-zinc-100 hover:dark:bg-zinc-650 p-1 transition-colors",
				)}
			>
				<OpenRectArrowIn className="h-4 w-4" />
				Login To GitHub
			</button>
		</>
	);
}
