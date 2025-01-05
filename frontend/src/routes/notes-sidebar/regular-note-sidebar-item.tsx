import type {
	BackendResponseWithData,
	NoteEntry,
} from "../../../bindings/github.com/etesam913/bytebook/lib/project_types/models";
import { humanFileSize } from "../../utils/misc";

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

export function RegularNoteSidebarItem({
	sidebarNoteName,
	sidebarQueryParams,
	sidebarNoteNameWithExtension,
	sidebarNoteNameWithoutExtension,
	isInTagSidebar,
	curNoteData,
	notePreviewResult,
}: {
	sidebarNoteName: string;
	sidebarQueryParams: {
		[key: string]: string;
	};
	sidebarNoteNameWithExtension: string;
	sidebarNoteNameWithoutExtension: string;
	isInTagSidebar: boolean;
	curNoteData: NoteEntry;
	notePreviewResult: BackendResponseWithData<string> | undefined;
}) {
	return (
		<div className="text-left w-full">
			<p className="whitespace-nowrap pointer-events-none text-ellipsis overflow-hidden">
				{isInTagSidebar
					? sidebarNoteNameWithoutExtension.split("/")[1]
					: sidebarNoteNameWithoutExtension}
				.{sidebarQueryParams.ext}
			</p>
			<p className="text-sm text-zinc-500 dark:text-zinc-400 h-5">
				{notePreviewResult?.success && notePreviewResult?.data}
			</p>
			<div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400">
				<p>{formatDateString(curNoteData.lastUpdated)}</p>
				<p>{humanFileSize(curNoteData.size, true)}</p>
			</div>
		</div>
	);
}
