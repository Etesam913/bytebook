import { RenderNoteIcon } from "./render-note-icon";

export function ListNoteSidebarItem({
	sidebarNoteName,
	sidebarQueryParams,
	activeNoteNameWithExtension,
	sidebarNoteNameWithoutExtension,
}: {
	sidebarNoteName: string;
	sidebarQueryParams: {
		[key: string]: string;
	};
	activeNoteNameWithExtension: string;
	sidebarNoteNameWithoutExtension: string;
}) {
	return (
		<>
			<RenderNoteIcon
				sidebarNoteName={sidebarNoteName}
				fileExtension={sidebarQueryParams.ext}
				noteNameWithExtension={activeNoteNameWithExtension}
			/>
			<p className="whitespace-nowrap pointer-events-none text-ellipsis overflow-hidden">
				{sidebarNoteNameWithoutExtension}.{sidebarQueryParams.ext}
			</p>
		</>
	);
}
