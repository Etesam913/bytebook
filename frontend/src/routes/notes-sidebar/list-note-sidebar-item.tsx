import { RenderNoteIcon } from "./render-note-icon";

export function ListNoteSidebarItem({
	sidebarNoteName,
	sidebarQueryParams,
	activeNoteNameWithExtension,
	sidebarNoteNameWithoutExtension,
	isInTagSidebar,
}: {
	sidebarNoteName: string;
	sidebarQueryParams: {
		[key: string]: string;
	};
	activeNoteNameWithExtension: string;
	sidebarNoteNameWithoutExtension: string;
	isInTagSidebar: boolean;
}) {
	return (
		<>
			<RenderNoteIcon
				sidebarNoteName={sidebarNoteName}
				fileExtension={sidebarQueryParams.ext}
				noteNameWithExtension={activeNoteNameWithExtension}
			/>
			<p className="whitespace-nowrap pointer-events-none text-ellipsis overflow-hidden">
				{isInTagSidebar
					? sidebarNoteNameWithoutExtension.split("/")[1]
					: sidebarNoteNameWithoutExtension}
				.{sidebarQueryParams.ext}
			</p>
		</>
	);
}
