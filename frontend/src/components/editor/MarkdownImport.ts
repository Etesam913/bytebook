import type {
	ElementTransformer,
	TextFormatTransformer,
	TextMatchTransformer,
} from "@lexical/markdown";
import type { TextNode } from "lexical";

import { $isListItemNode, $isListNode, type ListItemNode } from "@lexical/list";
import { useBasicTypeaheadTriggerMatch } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $isQuoteNode } from "@lexical/rich-text";
import { $findMatchingParent } from "@lexical/utils";
import {
	$createLineBreakNode,
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isParagraphNode,
	type ElementNode,
	ParagraphNode,
} from "lexical";
import { $createCodeNode, type CodeNode } from "./nodes/code";
import { PUNCTUATION_OR_SPACE, transformersByType } from "./transformers";
import { type Transformer, handleTextMatchTransformerReplace } from "./utils";

const CAN_USE_DOM: boolean =
	typeof window !== "undefined" &&
	typeof window.document !== "undefined" &&
	typeof window.document.createElement !== "undefined";
const IS_CHROME: boolean =
	CAN_USE_DOM && /^(?=.*Chrome).*/i.test(navigator.userAgent);
const IS_SAFARI: boolean =
	CAN_USE_DOM && /Version\/[\d.]+.*Safari/.test(navigator.userAgent);
const IS_APPLE_WEBKIT =
	CAN_USE_DOM && /AppleWebKit\/[\d.]+/.test(navigator.userAgent) && !IS_CHROME;

type TextFormatTransformersIndex = Readonly<{
	fullMatchRegExpByTag: Readonly<Record<string, RegExp>>;
	openTagsRegExp: RegExp;
	transformersByTag: Readonly<Record<string, TextFormatTransformer>>;
}>;

/* THIS CODE IS PRETTY MUCH FROM META EXCEPT SMALL MODIFICATION TO EMPTY LINE REMOVAL */

export function createMarkdownImport(
	transformers: Array<Transformer>,
): (markdownString: string, node?: ElementNode) => void {
	const byType = transformersByType(transformers);
	const textFormatTransformersIndex = createTextFormatTransformersIndex(
		byType.textFormat,
	);

	return (markdownString, node) => {
		const lines = markdownString.split("\n");
		const linesLength = lines.length;
		const root = node || $getRoot();
		root.clear();

		for (let i = 0; i < linesLength; i++) {
			const lineText = lines[i];
			// Codeblocks are processed first as anything inside such block
			// is ignored for further processing
			// TODO:
			// Abstract it to be dynamic as other transformers (add multiline match option)

			const [codeBlockNode, shiftedIndex] = importCodeBlock(lines, i, root);

			if (codeBlockNode !== null) {
				i = shiftedIndex;
				continue;
			}

			importBlocks(
				lineText,
				root,
				byType.element,
				textFormatTransformersIndex,
				byType.textMatch,
			);
		}

		// CHANGE: REMOVED THIS, I WANT TO KEEP NEW LINES
		// const children = root.getChildren();
		// for (const child of children) {
		//   if (isEmptyParagraph(child) && root.getChildrenSize() > 1) {
		//     child.remove();
		//   }
		// }

		if ($getSelection() !== null) {
			root.selectEnd();
		}
	};
}

function importBlocks(
	lineText: string,
	rootNode: ElementNode,
	elementTransformers: Array<ElementTransformer>,
	textFormatTransformersIndex: TextFormatTransformersIndex,
	textMatchTransformers: Array<TextMatchTransformer>,
) {
	const lineTextTrimmed = lineText.trim();
	const textNode = $createTextNode(lineTextTrimmed);
	const elementNode = $createParagraphNode();
	elementNode.append(textNode);
	rootNode.append(elementNode);

	for (const { regExp, replace } of elementTransformers) {
		const match = lineText.match(regExp);

		if (match) {
			textNode.setTextContent(lineText.slice(match[0].length));
			replace(elementNode, [textNode], match, true);
			break;
		}
	}

	importTextFormatTransformers(
		textNode,
		textFormatTransformersIndex,
		textMatchTransformers,
	);
}
const CODE_BLOCK_REG_EXP = /^```(\w{1,10})?\s?$/;

function importCodeBlock(
	lines: Array<string>,
	startLineIndex: number,
	rootNode: ElementNode,
): [CodeNode | null, number] {
	const openMatch = lines[startLineIndex].match(CODE_BLOCK_REG_EXP);
	if (openMatch) {
		let endLineIndex = startLineIndex;
		const linesLength = lines.length;

		while (++endLineIndex < linesLength) {
			const closeMatch = lines[endLineIndex].match(CODE_BLOCK_REG_EXP);

			if (closeMatch) {
				const code = lines.slice(startLineIndex + 1, endLineIndex).join("\n");
				const language = openMatch[1] ?? "";
				const codeBlockNode = $createCodeNode({ code, language, focus: false });
				rootNode.append(codeBlockNode);
				return [codeBlockNode, endLineIndex];
			}
		}
	}
	return [null, startLineIndex];
}

// Processing text content and replaces text format tags.
// It takes outermost tag match and its content, creates text node with
// format based on tag and then recursively executed over node's content
//
// E.g. for "*Hello **world**!*" string it will create text node with
// "Hello **world**!" content and italic format and run recursively over
// its content to transform "**world**" part
function importTextFormatTransformers(
	textNode: TextNode,
	textFormatTransformersIndex: TextFormatTransformersIndex,
	textMatchTransformers: Array<TextMatchTransformer>,
) {
	const textContent = textNode.getTextContent();
	const match = findOutermostMatch(textContent, textFormatTransformersIndex);

	if (!match) {
		// Once text format processing is done run text match transformers, as it
		// only can span within single text node (unline formats that can cover multiple nodes)
		importTextMatchTransformers(textNode, textMatchTransformers);
		return;
	}

	// biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
	let currentNode;
	// biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
	let remainderNode;
	// biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
	let leadingNode;

	// If matching full content there's no need to run splitText and can reuse existing textNode
	// to update its content and apply format. E.g. for **_Hello_** string after applying bold
	// format (**) it will reuse the same text node to apply italic (_)
	if (match[0] === textContent) {
		currentNode = textNode;
	} else {
		const startIndex = match.index || 0;
		const endIndex = startIndex + match[0].length;

		if (startIndex === 0) {
			[currentNode, remainderNode] = textNode.splitText(endIndex);
		} else {
			[leadingNode, currentNode, remainderNode] = textNode.splitText(
				startIndex,
				endIndex,
			);
		}
	}

	currentNode.setTextContent(match[2]);
	const transformer = textFormatTransformersIndex.transformersByTag[match[1]];

	if (transformer) {
		for (const format of transformer.format) {
			if (!currentNode.hasFormat(format)) {
				currentNode.toggleFormat(format);
			}
		}
	}

	// Recursively run over inner text if it's not inline code
	if (!currentNode.hasFormat("code")) {
		importTextFormatTransformers(
			currentNode,
			textFormatTransformersIndex,
			textMatchTransformers,
		);
	}

	// Run over leading/remaining text if any
	if (leadingNode) {
		importTextFormatTransformers(
			leadingNode,
			textFormatTransformersIndex,
			textMatchTransformers,
		);
	}

	if (remainderNode) {
		importTextFormatTransformers(
			remainderNode,
			textFormatTransformersIndex,
			textMatchTransformers,
		);
	}
}

function importTextMatchTransformers(
	textNode_: TextNode,
	textMatchTransformers: Array<TextMatchTransformer>,
) {
	const textNode = textNode_;

	for (const transformer of textMatchTransformers) {
		const match = textNode.getTextContent().match(transformer.importRegExp);

		const replaceNode = handleTextMatchTransformerReplace(
			transformer,
			textNode_,
			match,
		);

		if (replaceNode && match) {
			transformer.replace(replaceNode, match);
			break;
		}
	}
}

// Finds first "<tag>content<tag>" match that is not nested into another tag
function findOutermostMatch(
	textContent: string,
	textTransformersIndex: TextFormatTransformersIndex,
): RegExpMatchArray | null {
	const openTagsMatch = textContent.match(textTransformersIndex.openTagsRegExp);

	if (openTagsMatch == null) {
		return null;
	}

	for (const match of openTagsMatch) {
		// Open tags reg exp might capture leading space so removing it
		// before using match to find transformer
		const tag = match.replace(/^\s/, "");
		const fullMatchRegExp = textTransformersIndex.fullMatchRegExpByTag[tag];
		if (fullMatchRegExp == null) {
			continue;
		}

		const fullMatch = textContent.match(fullMatchRegExp);
		const transformer = textTransformersIndex.transformersByTag[tag];
		if (fullMatch != null && transformer != null) {
			if (transformer.intraword !== false) {
				return fullMatch;
			}

			// For non-intraword transformers checking if it's within a word
			// or surrounded with space/punctuation/newline
			const { index = 0 } = fullMatch;
			const beforeChar = textContent[index - 1];
			const afterChar = textContent[index + fullMatch[0].length];

			if (
				(!beforeChar || PUNCTUATION_OR_SPACE.test(beforeChar)) &&
				(!afterChar || PUNCTUATION_OR_SPACE.test(afterChar))
			) {
				return fullMatch;
			}
		}
	}

	return null;
}

function createTextFormatTransformersIndex(
	textTransformers: Array<TextFormatTransformer>,
): TextFormatTransformersIndex {
	const transformersByTag: Record<string, TextFormatTransformer> = {};
	const fullMatchRegExpByTag: Record<string, RegExp> = {};
	const openTagsRegExp = [];
	const escapeRegExp = "(?<![\\\\])";

	for (const transformer of textTransformers) {
		const { tag } = transformer;
		transformersByTag[tag] = transformer;
		const tagRegExp = tag.replace(/(\*|\^|\+)/g, "\\$1");
		openTagsRegExp.push(tagRegExp);

		if (IS_SAFARI || IS_APPLE_WEBKIT) {
			fullMatchRegExpByTag[tag] = new RegExp(
				`(${tagRegExp})(?![${tagRegExp}\\s])(.*?[^${tagRegExp}\\s])${tagRegExp}(?!${tagRegExp})`,
			);
		} else {
			fullMatchRegExpByTag[tag] = new RegExp(
				`(?<![\\\\${tagRegExp}])(${tagRegExp})((\\\\${tagRegExp})?.*?[^${tagRegExp}\\s](\\\\${tagRegExp})?)((?<!\\\\)|(?<=\\\\\\\\))(${tagRegExp})(?![\\\\${tagRegExp}])`,
			);
		}
	}

	return {
		// Reg exp to find open tag + content + close tag
		fullMatchRegExpByTag,
		// Reg exp to find opening tags
		openTagsRegExp: new RegExp(
			`${
				IS_SAFARI || IS_APPLE_WEBKIT ? "" : `${escapeRegExp}`
			}(${openTagsRegExp.join("|")})`,
			"g",
		),
		transformersByTag,
	};
}
