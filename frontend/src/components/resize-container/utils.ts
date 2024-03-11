import {
	$createNodeSelection,
	$getNodeByKey,
	$setSelection,
	type LexicalEditor,
	type LexicalNode,
} from "lexical";
import { EXPAND_CONTENT_COMMAND } from "../editor/plugins/image";
import type { Dispatch, SetStateAction } from "react";

function getNearestSiblingNode(node: LexicalNode, isRight: boolean) {
	let siblingNode: LexicalNode | null = isRight
		? node.getNextSibling()
		: node.getPreviousSibling();
	
	if (!siblingNode) {
		return null;
	}
	while (
		siblingNode?.getType() !== "image" &&
		siblingNode?.getType() !== "video"
	) {
		siblingNode = isRight
			? siblingNode?.getNextSibling()
			: siblingNode?.getPreviousSibling() ?? null;
		
		if (!siblingNode) {
			return null;
		}
	}
	return siblingNode;
}

export function expandNearestSiblingNode(
	editor: LexicalEditor,
	nodeKey: string,
	setIsExpanded: Dispatch<SetStateAction<boolean>>,
	isRightPressed: boolean,
) {
	editor.update(() => {
		const node = $getNodeByKey(nodeKey);
		if (node) {
			const nextNode = getNearestSiblingNode(node, isRightPressed);
			const nodeSelection = $createNodeSelection();
			if (!nextNode) return;
			nodeSelection.add(nextNode.getKey());
			$setSelection(nodeSelection);
			setIsExpanded(false);
			editor.dispatchCommand(EXPAND_CONTENT_COMMAND, nextNode.getKey());
		}
	});
}
