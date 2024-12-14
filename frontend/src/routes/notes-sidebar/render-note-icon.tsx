import { FileBan } from "../../icons/file-ban";
import { FilePen } from "../../icons/file-pen";
import { ImageIcon } from "../../icons/image";
import { Note } from "../../icons/page";
import { PDFIcon } from "../../icons/pdf-icon";
import { VideoIcon } from "../../icons/video";
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from "../../types";

export function RenderNoteIcon({
	noteNameWithExtension,
	sidebarNoteName,
	fileExtension,
}: {
	noteNameWithExtension: string;
	sidebarNoteName: string;
	fileExtension: string;
}) {
	if (fileExtension === "md") {
		if (noteNameWithExtension === sidebarNoteName) {
			return (
				<FilePen
					title="Editing Note"
					className="min-w-[1.25rem] pointer-events-none"
				/>
			);
		}
		return (
			<Note title="Note" className="min-w-[1.25rem] pointer-events-none" />
		);
	}

	if (fileExtension === "pdf") {
		return (
			<PDFIcon title="PDF" className="min-w-[1.25rem] pointer-events-none" />
		);
	}

	if (IMAGE_FILE_EXTENSIONS.includes(fileExtension)) {
		return (
			<ImageIcon
				title="Image"
				className="min-w-[1.25rem] pointer-events-none"
			/>
		);
	}

	if (VIDEO_FILE_EXTENSIONS.includes(fileExtension)) {
		return (
			<VideoIcon
				title="Video"
				className="min-w-[1.25rem] pointer-events-none"
			/>
		);
	}

	return (
		<FileBan
			title="Note Not Supported"
			className="min-w-[1.25rem] pointer-events-none"
		/>
	);
}
