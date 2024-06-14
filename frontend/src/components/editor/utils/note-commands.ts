import {
	$createNodeSelection,
	$getNodeByKey,
	$getSelection,
	$isDecoratorNode,
	$isElementNode,
	$isNodeSelection,
	$isRootNode,
	$setSelection,
	type LexicalNode,
} from "lexical";
import { isDecoratorNodeSelected } from "../../../utils/commands";

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

/** Goes in direction up the tree until it finds a valid sibling */
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

export function overrideUpDownKeyCommand(
	event: KeyboardEvent,
	command: "up" | "down",
) {
	const selection = $getSelection();
	const node = selection?.getNodes().at(0);

	if (!node) return true;
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
