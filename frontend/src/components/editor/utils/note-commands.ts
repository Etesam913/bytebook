import {
	$createNodeSelection,
	$createRangeSelection,
	$createTextNode,
	$getNodeByKey,
	$getSelection,
	$isDecoratorNode,
	$isElementNode,
	$isNodeSelection,
	$isRangeSelection,
	$isRootNode,
	$setSelection,
	type LexicalEditor,
	type LexicalNode,
	type NodeSelection,
} from "lexical";
import { isDecoratorNodeSelected } from "../../../utils/commands";
import { FILE_SERVER_URL } from "../../../utils/misc";
import { getFileExtension } from "../../../utils/string-formatting";
import type { FilePayload } from "../nodes/file";
import { $createLinkNode } from "../nodes/link";
import { INSERT_FILES_COMMAND } from "../plugins/file";

/**
 * Makes it so that the code-block undo/redo stack is not affected by the undo/redo stack of the editor
 */
export function overrideUndoRedoCommand() {
	const selection = $getSelection();
	if ($isNodeSelection(selection)) {
		const element = selection.getNodes().at(0);
		// The code-block has its own undo stack, no need to use lexical's undo stack for this
		if (element?.getType() === "code-block") {
			return true;
		}
	}
	return false;
}

/**
 * Adds or sets a node selection if the clicked element has the data-interactable attribute
 * and the data-nodeKey attribute
 */
export function overrideClickCommand(e: MouseEvent) {
	const element = e.target as HTMLElement;
	const isInteractable = element.getAttribute("data-interactable");
	if (isInteractable) {
		const nodeKey = element.getAttribute("data-nodeKey");
		if (!nodeKey) return true;

		let selection = $getSelection();
		const isRegularClick = !e.ctrlKey && !e.shiftKey && !e.metaKey;
		if (isRegularClick || !$isNodeSelection(selection)) {
			selection = $createNodeSelection();
		}

		(selection as NodeSelection).add(nodeKey);
		$setSelection(selection);
	}
	return true;
}

/** Goes in direction up the tree until it finds a valid sibling */
export function getFirstSiblingNode(
	node: LexicalNode | undefined,
	direction: "up" | "down",
) {
	if (!node) return null;
	let siblingNode =
		direction === "up" ? node.getPreviousSibling() : node.getNextSibling();
	let currentNode = node;
	while (!siblingNode) {
		const parent = currentNode.getParent();
		if (!parent) return null;
		currentNode = parent;
		siblingNode =
			direction === "up"
				? currentNode.getPreviousSibling()
				: currentNode.getNextSibling();
	}
	return siblingNode;
}

export function overrideUpDownKeyCommand(
	event: KeyboardEvent,
	command: "up" | "down",
) {
	const selection = $getSelection();
	const node = selection?.getNodes().at(0);
	const isShiftHeldDown = event.shiftKey;
	// You should be able to select multiple nodes when holding shift, so use the default select behavior in this case
	if (!node || isShiftHeldDown) return true;
	if ($isRootNode(node)) {
		const firstChild = node.getFirstChild();
		if (!firstChild) return true;
		return true;
	}

	const nextNode = getFirstSiblingNode(node, command);
	let nextNodeChild: LexicalNode | null = null;
	if (nextNode && $isElementNode(nextNode)) {
		nextNodeChild = nextNode.getChildren().at(0) ?? null;
	}
	const nodeToSelect = nextNodeChild ?? nextNode;

	// going from <p> -> <img>
	if ($isDecoratorNode(nodeToSelect)) {
		const newNodeSelection = $createNodeSelection();
		newNodeSelection.add(nodeToSelect.getKey());
		$setSelection(newNodeSelection);
		event.preventDefault();
	}
	// going from <img> -> <p>
	else if ($isDecoratorNode(node)) {
		event.preventDefault();
		if (node.getType() !== "code-block") {
			nodeToSelect?.selectEnd();
		}
	}

	return true;
}

/** Overrides the default behavior of the escape key to select the next sibling of a selected decorator node*/
export function overrideEscapeKeyCommand(nodeKey: string) {
	if (isDecoratorNodeSelected(nodeKey)) {
		const nodeElem = $getNodeByKey(nodeKey);
		if (nodeElem) {
			const nextElem = nodeElem.getNextSibling();
			if ($isDecoratorNode(nextElem)) {
				const nodeSelection = $createNodeSelection();
				nodeSelection.add(nextElem.getKey());
				$setSelection(nodeSelection);
			} else {
				nodeElem.selectNext(0, 0);
			}
		}
	}
	return false;
}

/**
 *
 * This function occurs when you drag text or a link from one note to another
 */
export function overrideControlledTextInsertion(
	e: string | InputEvent,
	editor: LexicalEditor,
	draggedElement: HTMLElement | null,
) {
	// @ts-ignore Data Transfer does exist when dragging a link
	if (!e.dataTransfer || !draggedElement) return false;
	// @ts-ignore Data Transfer does exist when dragging a link
	const fileText: string = e.dataTransfer.getData("text/plain");

	const files = fileText.split(",");

	const linkPayloads = [];
	const filesPayload: FilePayload[] = [];

	for (const fileText of files) {
		if (fileText.startsWith("wails:")) {
			const segments = fileText.split("/");
			// You are dealing with a folder link
			if (fileText.indexOf(".") === -1) {
				linkPayloads.push({
					url: fileText,
					title: segments.pop() ?? "",
				});
			}
			// You are dealing with a note link or a file link
			else {
				const { urlWithoutExtension, extension, fileName } =
					getFileExtension(fileText);

				// Create a link to the markdown note
				if (!urlWithoutExtension || !extension || !fileName) return true;
				const segments = urlWithoutExtension.split("/");

				const title = segments.pop() ?? "";
				const folder = segments.pop() ?? "";

				if (extension === "md") {
					linkPayloads.push({
						url: `${urlWithoutExtension}?ext=${extension}`,
						title: title,
					});
				} else {
					filesPayload.push({
						alt: title,
						src: `${FILE_SERVER_URL}/notes/${folder}/${fileName}.${extension}`,
					});
				}
			}
		}
	}

	// Creating links
	for (const linkPayload of linkPayloads) {
		const linkNode = $createLinkNode(linkPayload.url, {
			title: linkPayload.title,
		});
		const linkTextNode = $createTextNode(linkPayload.title);
		linkNode.append(linkTextNode);
		const selection = $getSelection();
		if ($isRangeSelection(selection)) {
			selection.insertNodes([linkNode]);
		}
	}
	if (filesPayload.length > 0) {
		editor.dispatchCommand(INSERT_FILES_COMMAND, filesPayload);
	}

	return true;
}
