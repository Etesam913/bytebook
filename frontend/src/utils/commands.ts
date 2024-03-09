import {
	$createNodeSelection,
	$createParagraphNode,
	$getNodeByKey,
	$getSelection,
	$isDecoratorNode,
	$isNodeSelection,
	$isRangeSelection,
	$setSelection,
	LexicalNode,
} from "lexical";

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
	console.log(selection);

	return selection.has(nodeKey);
}

/**
 * Handles the up/down arrow key commands for decorator nodes
 */
export function arrowKeyDecoratorNodeCommand(
	e: MouseEvent,
	nodeKey: string,
	up: boolean,
): boolean {
	const selection = $getSelection();
	if (!selection) return false;
	console.log(selection);
	// Happens when going from decorator node to p tag
	if ($isNodeSelection(selection)) {
		// If the current node is selected
		if (selection.has(nodeKey)) {
			// Do e.preventDefault() so that the arrow key is not applied twice
			e.preventDefault();
			const elementToSelect = up
				? $getNodeByKey(nodeKey)?.getPreviousSibling()
				: $getNodeByKey(nodeKey)?.getNextSibling();

			// If the previous/next sibling is a decorator node, we need custom behavior
			if ($isDecoratorNode(elementToSelect)) {
				const newNodeSelection = $createNodeSelection();
				newNodeSelection.add(elementToSelect.getKey());
				$setSelection(newNodeSelection);
				// true is returned to override any other events
				return true;
			}

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

export function escapeKeyDecoratorNodeCommand(nodeKey: string) {
	if (isDecoratorNodeSelected(nodeKey)) {
		const nodeElem = $getNodeByKey(nodeKey);
		if (nodeElem) {
			nodeElem.selectNext(0, 0);
		}
	}
	return false;
}

export function backspaceKeyDecoratorNodeCommand(
	e: KeyboardEvent,
	nodeKey: string,
) {
	if (isDecoratorNodeSelected(nodeKey)) {
		e.preventDefault();
		const node = $getNodeByKey(nodeKey);
		if (node) {
			node.remove();
			return true;
		}
	}
	return false;
}
