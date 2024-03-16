import {
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	type ElementTransformer,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	ORDERED_LIST,
	QUOTE,
	STRIKETHROUGH,
	type TextFormatTransformer,
	type TextMatchTransformer,
	UNORDERED_LIST,
} from "@lexical/markdown";
import {
	$createHeadingNode,
	$isHeadingNode,
	HeadingNode,
	type HeadingTagType,
} from "@lexical/rich-text";
import type { LanguageName } from "@uiw/codemirror-extensions-langs";
import {
	$createNodeSelection,
	$setSelection,
	type ElementNode,
	type LexicalNode,
} from "lexical";
import { $createCodeNode, $isCodeNode, CodeNode } from "./nodes/code";
import { $createImageNode, $isImageNode, ImageNode } from "./nodes/image";
import { $createVideoNode, $isVideoNode, VideoNode } from "./nodes/video";
import type { Transformer } from "./utils";

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

const srcRegex = /\/notes\/([^\/]+)\/([^\/]+)\//;

function updateSrc(nodeSrc: string) {
	// If it is coming from file-server update url if the folder name or note title changes
	if (nodeSrc.includes("localhost")) {
		const [_, currentFolder, currentNoteTitle] = location.pathname.split("/");

		return nodeSrc.replace(
			srcRegex,
			`/notes/${currentFolder}/${currentNoteTitle}/`,
		);
	}
	return nodeSrc;
}

const VIDEO_TRANSFORMER: ElementTransformer = {
	dependencies: [VideoNode],
	export: (node) => {
		if (!$isVideoNode(node)) {
			return null;
		}
		const videoSrc = updateSrc(node.getSrc());
		return `![${node.getTitleText()}](${videoSrc}) `;
	},
	regExp: /!(?:\[([^[]*)\])(?:\(([^)]+\.(?:mp4|mov))\))\s/,
	replace: (textNode, _, match) => {
		const [, title, src] = match;
		const videoNode = $createVideoNode({
			title,
			src,
		});
		const nodeSelection = $createNodeSelection();
		textNode.replace(videoNode);
		nodeSelection.add(textNode.getKey());
		$setSelection(nodeSelection);
	},
	type: "element",
};

const IMAGE_TRANSFORMER: ElementTransformer = {
	dependencies: [ImageNode],
	export: (node) => {
		if (!$isImageNode(node)) {
			return null;
		}
		const imageSrc = updateSrc(node.getSrc());

		// TODO: need to do sanitizing on the alt text
		return `![${node.getAltText()}](${imageSrc}) `;
	},
	// regExp: /!(?:\[([^[]*)\])(?:\(([^)]+\.(?!(mp4|mov)$).+))\)\s/,
	regExp: /!\[(?<alt>[^\]]*)\]\((?<filename>.*?)(?<!\.mp4|.mov)(?=\"|\))\)\s/,
	replace: (textNode, _1, match) => {
		const [_2, alt, src] = match;
		const imageNode = $createImageNode({
			alt,
			src,
		});
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
