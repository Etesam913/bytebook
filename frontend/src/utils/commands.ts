import {
	$createNodeSelection,
	$createParagraphNode,
	$getNodeByKey,
	$getSelection,
	$isDecoratorNode,
	$isNodeSelection,
	$isRangeSelection,
	$setSelection,
	type LexicalCommand,
	type LexicalNode,
	createCommand,
} from "lexical";

export const EXPAND_CONTENT_COMMAND: LexicalCommand<string> = createCommand(
	"EXPAND_CONTENT_COMMAND",
);

function getFirstSiblingNode(
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

export function isDecoratorNodeSelected(nodeKey: string) {
	const selection = $getSelection();

	if (!$isNodeSelection(selection)) return false;

	return selection.has(nodeKey);
}

export function onClickDecoratorNodeCommand(
	e: MouseEvent,
	node: HTMLElement | null,
	isResizing: boolean,
	setSelected: (arg0: boolean) => void,
	clearSelection: () => void,
): boolean {
	if (isResizing) {
		e.stopPropagation();
		return true;
	}

	if (e.target === node || node?.contains(e.target as Node)) {
		if (!e.shiftKey) clearSelection();
		setSelected(true);
		return true;
	}
	e.preventDefault();
	e.stopPropagation();
	return false;
}

/**
 * Handles the up/down arrow key commands for decorator nodes
 */
export function arrowKeyDecoratorNodeCommand(
	e: KeyboardEvent,
	nodeKey: string,
	up: boolean,
): boolean {
	const selection = $getSelection();

	if (!selection) return false;
	// Happens when going from decorator node to p tag
	if ($isNodeSelection(selection)) {
		// If the current node is selected
		if (selection.has(nodeKey)) {
			e.preventDefault();
			// Do e.preventDefault() so that the arrow key is not applied twice
			const elementToSelect = up
				? $getNodeByKey(nodeKey)?.getPreviousSibling()
				: $getNodeByKey(nodeKey)?.getNextSibling();
			// If the previous/next sibling is a decorator node, we need custom behavior
			if ($isDecoratorNode(elementToSelect)) {
				const newNodeSelection = $createNodeSelection();
				newNodeSelection.add(elementToSelect.getKey());
				$setSelection(newNodeSelection);
				return true;
			}

			elementToSelect?.selectEnd();
			// Otherwise we can let the browser handle the action
			return false;
		}
	}
	// Happens when going from p tag to decorator node
	if ($isRangeSelection(selection)) {
		// If the current node is selected
		const node = selection.getNodes().at(0);
		if (!node) return false;
		const elementToSelect = getFirstSiblingNode(node, up ? "up" : "down");

		if ($isDecoratorNode(elementToSelect)) {
			const newNodeSelection = $createNodeSelection();
			newNodeSelection.add(elementToSelect.getKey());
			$setSelection(newNodeSelection);
			e.preventDefault();
			// true is returned to override any other events
			return true;
		}
		// Otherwise we can let the browser handle the action
		return false;
	}

	return false;
}

/**
 * When enter is pressed on a selected decorator node,
 * a new paragraph node is inserted after it
 */
export function enterKeyDecoratorNodeCommand(
	e: KeyboardEvent,
	nodeKey: string,
) {
	if (isDecoratorNodeSelected(nodeKey)) {
		const node = $getNodeByKey(nodeKey);
		if (node) {
			// Prevents the double enter
			e.preventDefault();
			node.insertAfter($createParagraphNode());
			node.selectNext();
			return true;
		}
	}
	return false;
}

export function removeDecoratorNode(nodeKey: string) {
	const node = $getNodeByKey(nodeKey);
	if (node) {
		node.remove();
		return true;
	}
	return false;
}
