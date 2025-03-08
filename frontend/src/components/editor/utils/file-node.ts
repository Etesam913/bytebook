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
				return "image";
			}
			if (contentType.startsWith("video/")) {
				return "video";
			}
			return "unknown";
		}
		return "unknown";
	} catch {
		return "unknown";
	}
}

/** This function checks if the file type is unknown, and if so, it makes a HEAD request to the file to determine the type.
 * This is done because the file type is not always determined by the extension alone.
 * This does make it async though
 */
export async function getFileElementTypeFromExtensionAndHead(fileName: string) {
	let fileType = getFileElementTypeFromExtension(fileName);
	if (fileType === "unknown") {
		fileType = await checkURLType(fileName);
	}
	return fileType;
}

export function extractYouTubeVideoID(url: string): string | null {
	const regex =
		/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
	const match = url.match(regex);
	return match ? match[1] : null;
}

/**
 * Determines the type of file based on its extension. This function does not make a HEAD request to the file.
 *
 * @param {string} fileName - The name of the file whose type is to be determined.
 * @returns {FileType} - The type of the file, which can be 'image', 'video', 'pdf', or 'unknown'.
 */
export function getFileElementTypeFromExtension(fileName: string): FileType {
	// Check if the file extension matches any of the image file extensions
	const shouldCreateImage = IMAGE_FILE_EXTENSIONS.some((extension) =>
		fileName.endsWith(`.${extension}`),
	);
	if (shouldCreateImage) {
		return "image";
	}
	// Check if the file extension matches any of the video file extensions
	const shouldCreateVideo = VIDEO_FILE_EXTENSIONS.some((extension) =>
		fileName.endsWith(`.${extension}`),
	);

	if (shouldCreateVideo) {
		return "video";
	}
	const shouldCreateYouTube = extractYouTubeVideoID(fileName) !== null;
	if (shouldCreateYouTube) {
		return "youtube";
	}
	const shouldCreatePdf = fileName.endsWith(".pdf");

	// Return 'pdf' if the file is a PDF document
	if (shouldCreatePdf) {
		return "pdf";
	}

	return "unknown";
}
