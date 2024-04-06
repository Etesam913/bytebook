import {
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import {
	type ElementTransformer,
	TRANSFORMERS,
	type TextFormatTransformer,
	type TextMatchTransformer,
} from "@lexical/markdown";
import { $createHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import {
	$createNodeSelection,
	$createParagraphNode,
	$createTextNode,
	$getSelection,
	$isDecoratorNode,
	$isRangeSelection,
	$isRootNode,
	$setSelection,
	type ElementNode,
	type LexicalEditor,
	type LexicalNode,
	type TextFormatType,
	type TextNode,
} from "lexical";
import type { Dispatch, SetStateAction } from "react";
import { UploadImage } from "../../../bindings/main/NodeService";
// import { UploadImagesToFolder } from "../../../wailsjs/go/main/App";
import type { EditorBlockTypes } from "../../types";
import { createMarkdownExport } from "./MarkdownExport";
import { createMarkdownImport } from "./MarkdownImport";
import { ImageNode } from "./nodes/image";
import { INSERT_IMAGES_COMMAND, INSERT_IMAGE_COMMAND } from "./plugins/image";

export type TextFormats =
	| null
	| "bold"
	| "italic"
	| "underline"
	| "strikethrough";

export const blockTypesDropdownItems = [
	{ label: "Header 1", value: "h1" },
	{ label: "Header 2", value: "h2" },
	{ label: "Header 3", value: "h3" },
	{ label: "Paragraph", value: "paragraph" },
	{ label: "Unordered List", value: "ul" },
	{ label: "Ordered List", value: "ol" },
	{ label: "Checkbox List", value: "check" },
	{ label: "Image", value: "img" },
	{ label: "Table", value: "table" },
];

/**
 * Gets a selection and formats the blocks to `newBlockType`
 */
export function changeSelectedBlocksType(
	editor: LexicalEditor,
	newBlockType: EditorBlockTypes,
	folder: string,
	note: string,
) {
	editor.update(async () => {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) {
			switch (newBlockType) {
				case "paragraph":
					$setBlocksType(selection, () => $createParagraphNode());
					break;
				case "h1":
					$setBlocksType(selection, () => $createHeadingNode("h1"));
					break;
				case "h2":
					$setBlocksType(selection, () => $createHeadingNode("h2"));
					break;
				case "h3":
					$setBlocksType(selection, () => $createHeadingNode("h3"));
					break;
				case "ol":
					editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
					break;
				case "ul":
					editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
					break;
				case "table":
					editor.dispatchCommand(INSERT_TABLE_COMMAND, {
						columns: "2",
						rows: "2",
						includeHeaders: true,
					});
					break;
				case "img": {
					const filePaths = await UploadImage(folder, note);
					editor.update(() => {
						const payloads = filePaths.map((filePath) => ({
							src: `http://localhost:5890/${filePath}`,
							alt: "test",
						}));
						editor.dispatchCommand(INSERT_IMAGES_COMMAND, payloads);
					});
					break;
				}
			}
		}
	});
}

export function handleToolbarTextFormattingClick(
	currentSelectionFormat: TextFormatType[],
	setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>,
	textFormat: TextFormatType,
) {
	if (currentSelectionFormat.includes(textFormat)) {
		setCurrentSelectionFormat(
			currentSelectionFormat.filter((format) => format !== textFormat),
		);
	} else {
		setCurrentSelectionFormat([...currentSelectionFormat, textFormat]);
	}
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
	console.log(nextNode, $isDecoratorNode(nextNode));
	if ($isDecoratorNode(nextNode)) {
		const newNodeSelection = $createNodeSelection();
		newNodeSelection.add(nextNode.getKey());
		$setSelection(newNodeSelection);
		event.preventDefault();
		return true;
	}
	return true;
}

export type Transformer =
	| ElementTransformer
	| TextFormatTransformer
	| TextMatchTransformer;

export function $convertToMarkdownStringCorrect(
	transformers: Array<Transformer> = TRANSFORMERS,
	node?: ElementNode,
): string {
	const exportMarkdown = createMarkdownExport(transformers);
	return exportMarkdown(node);
}

export function $convertFromMarkdownStringCorrect(
	markdown: string,
	transformers: Array<Transformer> = TRANSFORMERS,
	node?: ElementNode,
): void {
	const importMarkdown = createMarkdownImport(transformers);
	importMarkdown(markdown, node);
}

/**
    Text match transformers (Image, Video, etc...)
    should have text to the left and right be paragraphs
    instead of text nodes. This allows for easier editing.

    Returns `undefined` if there is no match, otherwise returns the `replaceNode`
*/
export function handleTextMatchTransformerReplace(
	transformer: TextMatchTransformer,
	anchorNode: TextNode,
	match: RegExpMatchArray | null,
) {
	const textContent = anchorNode.getTextContent();

	if (!match) return;
	const startIndex = match.index || 0;
	const endIndex = startIndex + match[0].length;
	let replaceNode: TextNode | null = null;

	if (transformer.dependencies.includes(ImageNode)) {
		const textToLeft = textContent.slice(0, startIndex);
		const middleText = match[0];
		const textToRight = textContent.slice(endIndex);
		const parent = anchorNode.getParent();
		replaceNode = $createTextNode(middleText);
		if (parent) {
			// Remove old children and replace with just the image
			for (const child of parent.getChildren()) {
				child.remove();
			}

			const newParent = $createParagraphNode();

			parent.replace(newParent);
			newParent.select(0, 0);

			newParent.append(replaceNode);
			if (textToLeft.length > 0) {
				newParent.insertBefore(
					$createParagraphNode().append($createTextNode(textToLeft)),
				);
			}
			if (textToRight.length > 0) {
				newParent.insertAfter(
					$createParagraphNode().append($createTextNode(textToRight)),
				);
			}
			return replaceNode;
		}
	}
}
