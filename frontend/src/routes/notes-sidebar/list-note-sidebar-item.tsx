import { RenderNoteIcon } from "./render-note-icon";

export function ListNoteSidebarItem({
	sidebarNoteName,
	sidebarNoteExtension,
	activeNoteNameWithExtension,
	sidebarNoteNameWithoutExtension,
}: {
	sidebarNoteName: string;
	sidebarNoteExtension: string;
	activeNoteNameWithExtension: string;
	sidebarNoteNameWithoutExtension: string;
}) {
	return (
		<>
			<RenderNoteIcon
				sidebarNoteName={sidebarNoteName}
				fileExtension={sidebarNoteExtension}
				noteNameWithExtension={activeNoteNameWithExtension}
			/>
			<p className="whitespace-nowrap pointer-events-none text-ellipsis overflow-hidden">
				{sidebarNoteNameWithoutExtension}.{sidebarNoteExtension}
			</p>
		</>
	);
}
