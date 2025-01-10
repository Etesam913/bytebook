import type { NotePreviewData } from "../../../bindings/github.com/etesam913/bytebook";
import type {
	BackendResponseWithData,
	NoteEntry,
} from "../../../bindings/github.com/etesam913/bytebook/lib/project_types/models";
import { humanFileSize } from "../../utils/misc";
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
	isInTagSidebar,
	curNoteData,
	notePreviewResult,
	isSelected,
}: {
	sidebarQueryParams: {
		[key: string]: string;
	};
	sidebarNoteNameWithoutExtension: string;
	isInTagSidebar: boolean;
	curNoteData: NoteEntry;
	notePreviewResult: BackendResponseWithData<NotePreviewData> | undefined;
	isSelected: boolean;
}) {
	const doesHaveImage =
		notePreviewResult?.success && notePreviewResult?.data?.firstImageSrc !== "";
	return (
		<div className="text-left w-full">
			<div className="flex w-full justify-between gap-1.5">
				<div className={cn("w-full", isInTagSidebar && "w-[calc(100%-52px)]")}>
					<p
						className={cn(
							"whitespace-nowrap pointer-events-none text-ellipsis overflow-hidden",
							{
								"text-white": isSelected,
							},
						)}
					>
						{isInTagSidebar
							? sidebarNoteNameWithoutExtension.split("/")[1]
							: sidebarNoteNameWithoutExtension}
						.{sidebarQueryParams.ext}
					</p>
					<p
						className={cn(
							"text-sm text-zinc-500 dark:text-zinc-400 flex flex-col justify-center h-7 text-ellipsis overflow-hidden whitespace-nowrap pointer-events-none",
							{
								"text-white": isSelected,
							},
						)}
					>
						{notePreviewResult?.success && notePreviewResult?.data?.firstLine}
					</p>
				</div>
				{doesHaveImage && (
					<img
						alt={`Note preview of ${sidebarNoteNameWithoutExtension}`}
						className="h-[52px] w-auto rounded-md"
						src={notePreviewResult?.data?.firstImageSrc}
					/>
				)}
			</div>
			<div
				className={cn(
					"flex justify-between text-sm text-zinc-500 dark:text-zinc-400",
					{
						"text-white": isSelected,
					},
				)}
			>
				<p>{formatDateString(curNoteData.lastUpdated)}</p>
				<p>{humanFileSize(curNoteData.size, true)}</p>
			</div>
		</div>
	);
}
