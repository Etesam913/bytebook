import {
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	CODE,
	ElementTransformer,
	INLINE_CODE,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	LINK,
	ORDERED_LIST,
	QUOTE,
	STRIKETHROUGH,
	UNORDERED_LIST,
} from "@lexical/markdown";
import {
	$createHeadingNode,
	$isHeadingNode,
	HeadingNode,
	HeadingTagType,
} from "@lexical/rich-text";
import { $createParagraphNode, ElementNode, ParagraphNode } from "lexical";

const createBlockNode = (
	createNode: (match: Array<string>) => ElementNode,
): ElementTransformer["replace"] => {
	return (parentNode, children, match) => {
		const node = createNode(match);
		node.append(...children);
		parentNode.replace(node);
		node.select(0, 0);
	};
};

const CUSTOM_HEADING_TRANSFORMER: ElementTransformer = {
	dependencies: [HeadingNode],
	export: (node, exportChildren) => {
		if (!$isHeadingNode(node)) {
			return null;
		}
		const level = Number(node.getTag().slice(1));
		return `${"#".repeat(level)} ${exportChildren(node)}`;
	},
	regExp: /^(#{1,3})\s/,
	replace: createBlockNode((match) => {
		const tag = `h${match[1].length}` as HeadingTagType;
		return $createHeadingNode(tag);
	}),
	type: "element",
};

const LINE_BREAK_FIX: ElementTransformer = {
	dependencies: [ParagraphNode],
	export: () => {
		return null;
	},
	regExp: /^$/,
	replace: (_textNode, nodes, _, isImport) => {
		if (isImport && nodes.length === 1) {
			nodes[0].replace($createParagraphNode());
		}
	},
	type: "element",
};

export const CUSTOM_TRANSFORMERS = [
	CUSTOM_HEADING_TRANSFORMER,
	UNORDERED_LIST,
	CODE,
	ORDERED_LIST,
	QUOTE,
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	INLINE_CODE,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	STRIKETHROUGH,
	LINK,
	LINE_BREAK_FIX,
];
