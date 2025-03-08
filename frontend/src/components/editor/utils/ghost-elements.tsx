import type { LexicalNode } from "lexical";
import { createRoot } from "react-dom/client";
import { PDFIcon } from "../../../icons/pdf-icon";
import { VideoIcon } from "../../../icons/video";
import type { FileNode } from "../nodes/file";
/**
 * Constructs a ghost element for dragging based on the type of node
 * @param node - The Lexical node to create a ghost element for
 * @param ghostElement - The HTML element that will become the ghost element
 */
export function constructGhostElementForNode(
	node: LexicalNode,
	ghostElement: HTMLElement,
) {
	if (node.getType() === "file") {
		const fileNode = node as FileNode;
		if (fileNode.getElementType() === "image") {
			constructGhostElementForImage(node as FileNode, ghostElement);
		} else if (fileNode.getElementType() === "video") {
			constructGhostElementForVideo(ghostElement);
		} else if (fileNode.getElementType() === "pdf") {
			constructGhostElementForPdf(ghostElement);
		}
	}
}

function constructGhostElementForImage(
	fileNode: FileNode,
	ghostElement: HTMLElement,
) {
	const ghostElementChild = document.createElement("img");
	(ghostElementChild as HTMLImageElement).src = fileNode.getSrc();
	ghostElementChild.style.width = "15rem";
	ghostElementChild.style.height = "auto";
	ghostElementChild.style.borderRadius = "0.25rem";
	ghostElement.style.padding = "0.5rem";
	ghostElement.replaceChildren(ghostElementChild);
}

function constructGhostElementForVideo(ghostElement: HTMLElement) {
	const container = document.createElement("div");
	const root = createRoot(container);

	root.render(
		<div className="flex items-center gap-1">
			<VideoIcon width={24} height={24} fill="currentColor" />
			Video
		</div>,
	);
	ghostElement.replaceChildren(container);
}

function constructGhostElementForPdf(ghostElement: HTMLElement) {
	const container = document.createElement("div");
	const root = createRoot(container);

	root.render(
		<div className="flex items-center gap-1">
			<PDFIcon width={24} height={24} fill="currentColor" />
			PDF
		</div>,
	);
	ghostElement.replaceChildren(container);
}
