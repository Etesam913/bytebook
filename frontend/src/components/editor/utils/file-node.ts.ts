import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from "../../../types";
import type { FileType } from "../nodes/file";

/**
 * Asynchronously checks the type of content at a given URL.
 *
 * This function sends a HEAD request to the specified URL to retrieve the content type
 * without downloading the entire content. It then determines if the content is an image,
 * video, or other type based on the "Content-Type" header in the response.
 *
 * @example
 * checkURLType("https://example.com/image.jpg").then(type => console.log(type)); // "Image"
 */
async function checkURLType(url: string) {
	try {
		const response = await fetch(url, { method: "HEAD" });
		const contentType = response.headers.get("Content-Type");
		if (contentType) {
			if (contentType.startsWith("image/")) {
				return "Image";
			}
			if (contentType.startsWith("video/")) {
				return "Video";
			}
			return "Other";
		}
		return "Unknown";
	} catch (error) {
		return `Error: ${error}`;
	}
}

/**
 * Determines the type of file based on its extension.
 *
 * @param {string} fileName - The name of the file whose type is to be determined.
 * @returns {FileType} - The type of the file, which can be 'image', 'video', 'pdf', or 'unknown'.
 */
export async function getFileElementTypeFromExtension(
	fileName: string,
): Promise<FileType> {
	// Check if the file extension matches any of the image file extensions
	const shouldCreateImage = IMAGE_FILE_EXTENSIONS.some((extension) =>
		fileName.endsWith(`.${extension}`),
	);

	// Check if the file extension matches any of the video file extensions
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

	// Return 'pdf' if the file is a PDF document
	if (shouldCreatePdf) {
		return "pdf";
	}

	const type = await checkURLType(fileName);
	if (type === "Image") {
		return "image";
	}
	if (type === "Video") {
		return "video";
	}

	return "unknown";
}
