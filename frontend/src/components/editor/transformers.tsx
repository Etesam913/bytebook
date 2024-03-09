import {
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	ElementTransformer,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	ORDERED_LIST,
	QUOTE,
	STRIKETHROUGH,
	TextFormatTransformer,
	TextMatchTransformer,
	UNORDERED_LIST,
} from "@lexical/markdown";
import {
	$createHeadingNode,
	$isHeadingNode,
	HeadingNode,
	HeadingTagType,
} from "@lexical/rich-text";
import { type LanguageName } from "@uiw/codemirror-extensions-langs";
import { ElementNode, LexicalNode } from "lexical";
import { $createCodeNode, $isCodeNode, CodeNode } from "./nodes/code";
import { $createImageNode, $isImageNode, ImageNode } from "./nodes/image";
import { $createVideoNode, $isVideoNode, VideoNode } from "./nodes/video";
import { type Transformer } from "./utils";

const createBlockNode = (
	createNode: (match: Array<string>) => ElementNode,
): ElementTransformer["replace"] => {
	return (parentNode, children, match) => {
		const node = createNode(match);
		console.log(node);
		node.append(...children);
		parentNode.replace(node);
		node.select(0, 0);
	};
};

const VIDEO_TRANSFORMER: TextMatchTransformer = {
	dependencies: [VideoNode],
	export: (node) => {
		if (!$isVideoNode(node)) {
			return null;
		}
		return `![${node.getTitleText()}](${node.getSrc()})`;
	},
	importRegExp: /!(?:\[([^[]*)\])(?:\(([^)]+\.(?:mp4|mov))\))$/,
	regExp: /!(?:\[([^[]*)\])(?:\(([^)]+\.(?:mp4|mov))\))$/,
	replace: (textNode, match) => {
		const [, title, src] = match;
		const videoNode = $createVideoNode({
			title,
			src,
		});
		textNode.replace(videoNode);
	},
	trigger: ")",
	type: "text-match",
};

export const CODE_TRANSFORMER: ElementTransformer = {
	dependencies: [CodeNode],
	export: (node: LexicalNode) => {
		if (!$isCodeNode(node)) {
			return null;
		}
		const textContent = node.getCode();
		return `\`\`\`${node.getLanguage() || ""}${
			textContent ? `\n${textContent}` : ""
		}\n\`\`\``;
	},
	regExp: /^```(\w{1,10})?\s/,
	replace: (textNode, _1, match, isImport) => {
		const [_2, language] = match;
		const codeNode = $createCodeNode({
			code: "",
			language: language as LanguageName,
			focus: !isImport,
		});
		textNode.replace(codeNode);
	},
	type: "element",
};

const IMAGE_TRANSFORMER: ElementTransformer = {
	dependencies: [ImageNode],
	export: (node) => {
		if (!$isImageNode(node)) {
			return null;
		}
		// TODO: need to do sanitizing on the alt text
		return `![${node.getAltText()}](${node.getSrc()}) `;
	},
	// importRegExp: /!(?:\[([^[]*)\])(?:\(([^)]+\.(?:png|jpg|webp|jpeg))\))/,
	// regExp: /!(?:\[([^[]*)\])(?:\(([^)]+\.(?:png|jpg|webp|jpeg))\))$/,
	regExp: /^!\[([^\]]+)\]\(([^)]+)\)\s/,
	replace: (textNode, _1, match) => {
		const [_2, alt, src] = match;
		const imageNode = $createImageNode({
			alt,
			src,
		});
		console.log("replace transformer");
		textNode.replace(imageNode);
	},
	// trigger: ")",
	type: "element",
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

function indexBy<T>(
	list: Array<T>,
	callback: (arg0: T) => string,
): Readonly<Record<string, Array<T>>> {
	const index: Record<string, Array<T>> = {};

	for (const item of list) {
		const key = callback(item);

		if (index[key]) {
			index[key].push(item);
		} else {
			index[key] = [item];
		}
	}

	return index;
}

export function transformersByType(transformers: Array<Transformer>): Readonly<{
	element: Array<ElementTransformer>;
	textFormat: Array<TextFormatTransformer>;
	textMatch: Array<TextMatchTransformer>;
}> {
	const byType = indexBy(transformers, (t) => t.type);

	return {
		element: (byType.element || []) as Array<ElementTransformer>,
		textFormat: (byType["text-format"] || []) as Array<TextFormatTransformer>,
		textMatch: (byType["text-match"] || []) as Array<TextMatchTransformer>,
	};
}

export const CUSTOM_TRANSFORMERS = [
	CUSTOM_HEADING_TRANSFORMER,
	UNORDERED_LIST,
	// CODE,
	ORDERED_LIST,
	QUOTE,
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	// INLINE_CODE,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	STRIKETHROUGH,
	// LINK,
	IMAGE_TRANSFORMER,
	VIDEO_TRANSFORMER,
	CODE_TRANSFORMER,
];
