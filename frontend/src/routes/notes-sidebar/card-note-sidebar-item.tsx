import { useMemo, useState } from "react";
import type { NotePreviewData } from "../../../bindings/github.com/etesam913/bytebook";
import type { BackendResponseWithData } from "../../../bindings/github.com/etesam913/bytebook/lib/project_types/models";
import { VIDEO_FILE_EXTENSIONS } from "../../types";
import { humanFileSize } from "../../utils/general";
import { cn } from "../../utils/string-formatting";

function formatDateString(isoString: string): string {
	// Parse the ISO 8601 string into a Date object
	const date = new Date(isoString);

	// Define options for formatting the date
	const options: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "short",
		day: "numeric",
	};

	// Format the date using toLocaleDateString with the specified options
	return date.toLocaleDateString("en-US", options);
}

export function CardNoteSidebarItem({
	sidebarQueryParams,
	sidebarNoteNameWithoutExtension,
	notePreviewResult,
	imgSrc,
	isSelected,
}: {
	sidebarQueryParams: {
		[key: string]: string;
	};
	sidebarNoteNameWithoutExtension: string;
	notePreviewResult: BackendResponseWithData<NotePreviewData> | null;
	imgSrc: string;
	isSelected: boolean;
}) {
	const [isImageLoading, setIsImageLoading] = useState(true);
	const [isImageError, setIsImageError] = useState(false);

	const fileExtension = useMemo(
		() => (imgSrc.split(".").pop() ?? "").toLowerCase(),
		[imgSrc],
	);
	const doesHaveImage = useMemo(
		() => imgSrc !== "" && !VIDEO_FILE_EXTENSIONS.includes(fileExtension),
		[imgSrc, fileExtension],
	);
	return (
		<div className="text-left pointer-events-none w-full">
			<div className="flex w-full justify-between gap-1.5">
				<div className={cn("w-full", doesHaveImage && "w-[calc(100%-52px)]")}>
					<p
						className={cn(
							"whitespace-nowrap pointer-events-none text-ellipsis overflow-hidden",
							isSelected && "!text-white",
						)}
					>
						{sidebarNoteNameWithoutExtension}.{sidebarQueryParams.ext}
					</p>
					<p
						className={cn(
							"text-sm text-zinc-500 dark:text-zinc-400 flex flex-col justify-center h-7 text-ellipsis overflow-hidden whitespace-nowrap pointer-events-none",
							isSelected && "!text-white",
						)}
					>
						{notePreviewResult?.success && notePreviewResult?.data?.firstLine}
					</p>
				</div>
				{doesHaveImage && !isImageError && (
					<>
						{isImageLoading && (
							<div className="h-[52px] w-[42px] rounded-md bg-gray-200 animate-pulse" />
						)}
						<img
							onLoad={() => setIsImageLoading(false)}
							onError={() => setIsImageError(true)}
							style={{ display: isImageLoading ? "none" : "block" }}
							alt={`Note preview of ${sidebarNoteNameWithoutExtension}`}
							className="h-[52px] w-auto rounded-md"
							src={imgSrc}
						/>
					</>
				)}
			</div>
			<div
				className={cn(
					"flex justify-between text-sm text-zinc-500 dark:text-zinc-400",
					isSelected && "!text-white",
				)}
			>
				<p>{formatDateString(notePreviewResult?.data?.lastUpdated ?? "")}</p>
				<p>{humanFileSize(notePreviewResult?.data?.size ?? 0, true)}</p>
			</div>
		</div>
	);
}
