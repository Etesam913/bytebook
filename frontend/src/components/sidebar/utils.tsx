import type { Dispatch, DragEvent, SetStateAction } from "react";
import ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import { Folder } from "../../icons/folder";
import { ImageIcon } from "../../icons/image";
import { Note } from "../../icons/page";

/** Gets the file icon for the dragged item */
function getFileIcon(fileType: "folder" | "note" | "image") {
	switch (fileType) {
		case "folder":
			return <Folder className="min-w-[1.25rem]" title="" />;
		case "note":
			return <Note className="min-w-[1.25rem]" title="" />;
		case "image":
			return <ImageIcon className="min-w-[1.25rem]" title="" />;
	}
}

/**
 * Handles the drag start event for dragging files of various types.
 *
 * @param e - The drag event triggered by the user.
 * @param setSelectionRange - Function to update the selected range.
 * @param files - Array of file paths.
 * @param fileType - Type of the files being dragged ("folder", "note", or "image").
 * @param draggedIndex - Index of the file being dragged.
 * @param folder - Optional folder path for notes.
 */
export function handleDragStart(
	e: DragEvent<HTMLAnchorElement>,
	setSelectionRange: Dispatch<SetStateAction<Set<string>>>,
	fileType: "folder" | "note" | "image",
	draggedItem: string,
	folder?: string,
) {
	setSelectionRange((tempSet) => {
		const tempSelectionRange = new Set(tempSet);
		tempSelectionRange.add(draggedItem);

		// Map selected file indices to their internal URLs
		const selectedFiles = Array.from(tempSelectionRange).map((name) => {
			if (fileType === "folder") {
				return `wails://localhost:5173/${name}`;
			}
			// A note link should have a folder associated with it
			if (!folder) {
				return "";
			}
			return `wails://localhost:5173/${folder}/${name}`;
		});

		// Setting the data for the CONTROLLED_TEXT_INSERTION_COMMAND
		e.dataTransfer.setData("text/plain", selectedFiles.join(","));

		// Adding the children to the drag element in the case where multiple attachments are selected
		const dragElement = e.target as HTMLElement;

		const ghostElement = dragElement.cloneNode(true) as HTMLElement;
		ghostElement.id = "dragged-element";
		ghostElement.classList.add("dragging", "drag-grid");
		// Remove the selected classes
		ghostElement.classList.remove("!bg-blue-400", "dark:!bg-blue-600");

		// Create child elements for the drag preview
		const children = selectedFiles.map((file) => {
			return (
				<>
					{getFileIcon(fileType)}
					<p className="overflow-hidden text-ellipsis whitespace-nowrap">
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
			dragElement.removeEventListener("dragEnd", handleDragEnd);
		}

		dragElement.addEventListener("dragend", handleDragEnd);

		return tempSelectionRange;
	});
}
