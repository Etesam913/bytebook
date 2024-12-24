import { useState } from "react";
import { BottomBar } from "../../components/editor/bottom-bar";
import { Loader } from "../../icons/loader";
import { cn } from "../../utils/string-formatting";

export function SidebarVideo({
	folder,
	note,
	fileUrl,
	fileExtension,
	isNoteMaximized,
	draggedElement,
}: {
	folder: string;
	note: string;
	fileUrl: string;
	fileExtension: string;
	isNoteMaximized: boolean;
	draggedElement: HTMLElement | null;
}) {
	const [isLoading, setIsLoading] = useState(true);

	return (
		<>
			{isLoading && (
				<Loader width={42} height={42} className="mx-auto my-auto" />
			)}
			<video
				controls
				title={note}
				onLoadedData={() => setIsLoading(false)}
				className={cn(
					"flex-1 overflow-auto mr-1 bg-black",
					isNoteMaximized && "w-full mr-0",
					draggedElement !== null && "pointer-events-none",
				)}
				src={fileUrl}
				style={{ display: isLoading ? "none" : "block" }}
			/>
			<BottomBar folder={folder} note={note} ext={fileExtension} />
		</>
	);
}
