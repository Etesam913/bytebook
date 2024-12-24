import { useState } from "react";
import { BottomBar } from "../../components/editor/bottom-bar";
import { Loader } from "../../icons/loader";
import { cn } from "../../utils/string-formatting";

export function SidebarImage({
	folder,
	note,
	fileUrl,
	fileExtension,
	isNoteMaximized,
}: {
	folder: string;
	note: string;
	fileUrl: string;
	fileExtension: string;
	isNoteMaximized: boolean;
}) {
	const [isLoading, setIsLoading] = useState(true);

	return (
		<>
			{isLoading && (
				<Loader width={42} height={42} className="mx-auto my-auto" />
			)}
			<img
				className={cn(
					"flex-1 overflow-auto object-contain my-auto mr-1",
					isNoteMaximized && "w-full",
				)}
				alt={note}
				title={note}
				src={fileUrl}
				onLoad={() => setIsLoading(false)}
				style={{ display: isLoading ? "none" : "block" }}
			/>
			<BottomBar folder={folder} note={note} ext={fileExtension} />
		</>
	);
}
