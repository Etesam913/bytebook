import {
	$createNodeSelection,
	$getNodeByKey,
	$setSelection,
	type ElementNode,
	type LexicalEditor,
	type LexicalNode,
} from "lexical";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { EXPAND_CONTENT_COMMAND } from "../../utils/commands";

/** Finds the next image/video tag for a given node */
function getNearestSiblingNode(node: LexicalNode, isRight: boolean) {
	let siblingNode: ElementNode | null = isRight
		? node.getNextSibling()
		: node.getPreviousSibling();

	if (!siblingNode) {
		return null;
	}

	while (
		siblingNode?.getType() !== "image" &&
		siblingNode?.getType() !== "video"
	) {
		const children = siblingNode.getChildren();
		const imageOrVideoChild = children.find(
			(n) => n.getType() === "image" || n.getType() === "video",
		);
		if (imageOrVideoChild) return imageOrVideoChild;

		siblingNode = isRight
			? siblingNode?.getNextSibling()
			: siblingNode?.getPreviousSibling() ?? null;

		if (!siblingNode) {
			return null;
		}
	}
	return siblingNode;
}

/** Expand the nearest sibling node for the resize-container. This is for album right/left arrow keys */
export function expandNearestSiblingNode(
	editor: LexicalEditor,
	nodeKey: string,
	setIsExpanded: Dispatch<SetStateAction<boolean>>,
	isRightPressed: boolean,
) {
	editor.update(() => {
		const node = $getNodeByKey(nodeKey);
		if (node) {
			const nodeParent = node.getParent();
			if (!nodeParent) return;
			const nextNode = getNearestSiblingNode(nodeParent, isRightPressed);
			const nodeSelection = $createNodeSelection();
			if (!nextNode) return;
			nodeSelection.add(nextNode.getKey());
			$setSelection(nodeSelection);
			setIsExpanded(false);
			editor.dispatchCommand(EXPAND_CONTENT_COMMAND, nextNode.getKey());
		}
	});
}

/**
 * useMouseActivity: A custom React hook that manages the visibility of elements based on mouse activity.
 * @param {number} timeout - The duration in milliseconds after which the elements should hide when the mouse is inactive.
 * @returns {boolean} isVisible - A boolean that indicates whether the elements should be visible.
 */
export function useMouseActivity(
	timeout: number = 1500,
	isActive = false,
): boolean {
	const [isVisible, setIsVisible] = useState<boolean>(true);
	let timer: ReturnType<typeof setTimeout>;

	useEffect(() => {
		if (!isActive) {
			return;
		}
		// Function to set visibility to true and reset the timer
		const handleMouseMovement = () => {
			if (!isVisible) setIsVisible(true);
			clearTimeout(timer);
			timer = setTimeout(() => {
				setIsVisible(false);
			}, timeout);
		};

		// Add event listener for mouse movement
		document.addEventListener("mousemove", handleMouseMovement);

		// Set the initial timer
		timer = setTimeout(() => {
			setIsVisible(false);
		}, timeout);

		// Clean up function
		return () => {
			clearTimeout(timer);
			document.removeEventListener("mousemove", handleMouseMovement);
		};
	}, [isVisible, timeout, isActive]);

	return isVisible;
}
