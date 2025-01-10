import { RenderNoteIcon } from "./render-note-icon";

export function ListNoteSidebarItem({
	sidebarNoteName,
	sidebarQueryParams,
	sidebarNoteNameWithExtension,
	sidebarNoteNameWithoutExtension,
	isInTagSidebar,
}: {
	sidebarNoteName: string;
	sidebarQueryParams: {
		[key: string]: string;
	};
	sidebarNoteNameWithExtension: string;
	sidebarNoteNameWithoutExtension: string;
	isInTagSidebar: boolean;
}) {
	return (
		<>
			<RenderNoteIcon
				sidebarNoteName={sidebarNoteName}
				fileExtension={sidebarQueryParams.ext}
				noteNameWithExtension={sidebarNoteNameWithExtension}
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
