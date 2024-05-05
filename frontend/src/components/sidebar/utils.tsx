import type { Dispatch, DragEvent, SetStateAction } from "react";
import ReactDOM from "react-dom";
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

export function handleDragStart(
	e: DragEvent<HTMLAnchorElement>,
	selectionRange: Set<number>,
	setSelectionRange: Dispatch<SetStateAction<Set<number>>>,
	files: string[],
	fileType: "folder" | "note" | "image",
	draggedIndex: number,
	folder?: string,
) {
	const tempSelectionRange = new Set(selectionRange);
	tempSelectionRange.add(draggedIndex);
	setSelectionRange(tempSelectionRange);

	// These are internal links
	const selectedFiles = Array.from(tempSelectionRange).map((index) => {
		if (fileType === "folder") {
			return `wails://localhost:5173/${files[index]}`;
		}
		// A note link should have a folder associated with it
		if (!folder) {
			return "";
		}
		return `wails://localhost:5173/${folder}/${files[index]}`;
	});

	// Setting the data for the CONTROLLED_TEXT_INSERTION_COMMAND
	e.dataTransfer.setData("text/plain", selectedFiles.join(","));

	// Adding the children to the drag element in the case where there are multiple attachments selected
	const dragElement = e.target as HTMLElement;

	const ghostElement = dragElement.cloneNode(true) as HTMLElement;
	ghostElement.classList.add("dragging", "drag-grid");
	// Remove the selected classes
	ghostElement.classList.remove("!bg-blue-400", "dark:!bg-blue-600");

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

	document.body.appendChild(ghostElement);
	ReactDOM.render(children, ghostElement);
	e.dataTransfer.setDragImage(ghostElement, -25, -25);

	// Cleaning up the ghost element after the drag ends
	function handleDragEnd() {
		// Update the selected range so that only 1 item is highlighted
		setSelectionRange(new Set());
		ghostElement.remove();
		dragElement.removeEventListener("dragEnd", handleDragEnd);
	}

	dragElement.addEventListener("dragend", handleDragEnd);
}
