import type { Dispatch, DragEvent, SetStateAction } from "react";
import { createRoot } from "react-dom/client";
import { Folder } from "../../icons/folder";
import { ImageIcon } from "../../icons/image";
import { Note } from "../../icons/page";
import { BYTEBOOK_DRAG_DATA_FORMAT } from "../../utils/draggable";
import { extractInfoFromNoteName } from "../../utils/string-formatting";

/** Gets the file icon for the dragged item */
function getFileIcon(fileType: "folder" | "note" | "image") {
	switch (fileType) {
		case "folder":
			return <Folder className="min-w-5" height={20} width={20} title="" />;
		case "note":
			return <Note className="min-w-5 w-5" title="" />;
		case "image":
			return <ImageIcon className="min-w-5 w-5" title="" />;
	}
}

/**
 * Handles the drag start event for dragging files of various types.
 *
 * @param e - The drag event triggered by the user.
 * @param setSelectionRange - Function to update the selected range.
 * @param files - Array of file paths.
 * @param contentType - Type of the files being dragged ("folder", "note", or "image").
 * @param draggedIndex - Index of the file being dragged.
 * @param folder - Optional folder path for notes.
 */
export function handleDragStart(
	e: DragEvent<HTMLAnchorElement> | DragEvent<HTMLButtonElement>,
	setSelectionRange: Dispatch<SetStateAction<Set<string>>>,
	contentType: "folder" | "note",
	draggedItem: string,
	setDraggedElement: Dispatch<SetStateAction<HTMLElement | null>>,
	folder?: string,
) {
	setSelectionRange((tempSet) => {
		const tempSelectionRange = new Set(tempSet);
		tempSelectionRange.add(`${contentType}:${draggedItem}`);

		// Map selected files to their internal URLs
		const selectedFiles = Array.from(tempSelectionRange).map(
			(noteNameWithExtensionParam) => {
				const noteNameWithoutPrefixWithExtension =
					noteNameWithExtensionParam.split(":")[1];
				const { noteNameWithoutExtension, queryParams } =
					extractInfoFromNoteName(noteNameWithoutPrefixWithExtension);

				if (contentType === "folder") {
					return `wails://localhost:5173/${noteNameWithoutExtension}`;
				}
				// A note link should have a folder associated with it
				if (!folder) {
					return "";
				}
				return `wails://localhost:5173/${folder}/${noteNameWithoutExtension}.${queryParams.ext}`;
			},
		);
		// Setting the data for the CONTROLLED_TEXT_INSERTION_COMMAND
		e.dataTransfer.setData("text/plain", selectedFiles.join(","));

		const bytebookFilesData = Array.from(tempSelectionRange).map(
			(noteNameWithExtensionParam) => {
				const noteNameWithoutPrefixWithExtension =
					noteNameWithExtensionParam.split(":")[1];
				const { noteNameWithoutExtension, queryParams } =
					extractInfoFromNoteName(noteNameWithoutPrefixWithExtension);
				let curItemFolder: string | null = null;
				let curItemNote: string | null = null;
				if (contentType === "folder") {
					curItemFolder = noteNameWithoutPrefixWithExtension;
				} else if (contentType === "note") {
					curItemFolder = folder ?? null;
					curItemNote = noteNameWithoutExtension;
				}
				return {
					folder: curItemFolder,
					note: curItemNote,
					extension: queryParams.ext,
				};
			},
		);
		if (contentType === "note") {
			e.dataTransfer.effectAllowed = "copy";
			e.dataTransfer.setData(
				BYTEBOOK_DRAG_DATA_FORMAT,
				JSON.stringify({ fileData: bytebookFilesData }),
			);
		}

		// Adding the children to the drag element in the case where multiple attachments are selected
		const dragElement = e.target as HTMLElement;

		const ghostElement = dragElement.cloneNode(true) as HTMLElement;

		ghostElement.id = "sidebar-element";
		ghostElement.classList.add("dragging", "drag-grid");
		// Remove the selected classes
		ghostElement.classList.remove("!bg-[var(--accent-color)]");
		setDraggedElement(ghostElement);

		// Create child elements for the drag preview
		const children = selectedFiles.map((file) => {
			return (
				<>
					{getFileIcon(contentType)}
					<p
						key={file}
						className="overflow-hidden text-ellipsis whitespace-nowrap"
					>
						{file.split("/").at(-1)}
					</p>
				</>
			);
		});

		// Append and render the ghost element
		document.body.appendChild(ghostElement);
		const ghostRoot = createRoot(ghostElement);
		ghostRoot.render(children);
		e.dataTransfer.setDragImage(ghostElement, -25, -25);

		// Clean up the ghost element after the drag ends
		function handleDragEnd() {
			// Update the selected range so that only 1 item is highlighted
			setSelectionRange(new Set());
			ghostElement.remove();
			setDraggedElement(null);
			dragElement.removeEventListener("dragEnd", handleDragEnd);
		}

		dragElement.addEventListener("dragend", handleDragEnd);

		return tempSelectionRange;
	});
}
