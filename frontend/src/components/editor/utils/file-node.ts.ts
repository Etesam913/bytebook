import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from "../../../types";
import type { FileType } from "../nodes/file";

export function getFileElementTypeFromExtension(fileName: string): FileType {
	const shouldCreateImage = IMAGE_FILE_EXTENSIONS.some((extension) =>
		fileName.endsWith(`.${extension}`),
	);
	const shouldCreateVideo = VIDEO_FILE_EXTENSIONS.some((extension) =>
		fileName.endsWith(`.${extension}`),
	);
	const shouldCreatePdf = fileName.endsWith(".pdf");

	if (shouldCreateImage) {
		return "image";
	}
	if (shouldCreateVideo) {
		return "video";
	}
	if (shouldCreatePdf) {
		return "pdf";
	}

	return "unknown";
}
