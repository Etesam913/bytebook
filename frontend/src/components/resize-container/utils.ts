import type { LexicalNode } from "lexical";

export function getNearestSiblingNode(node: LexicalNode, isRight: boolean) {
	let siblingNode: LexicalNode | null = isRight
		? node.getNextSibling()
		: node.getPreviousSibling();
	if (!siblingNode) {
		return null;
	}
	console.log(siblingNode?.getType());
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
