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
import {
	$createNodeSelection,
	$createParagraphNode,
	$getNearestNodeFromDOMNode,
	$getSelection,
	$isDecoratorNode,
	$isNodeSelection,
	$isRangeSelection,
	$setSelection,
	ElementNode,
	LexicalEditor,
	TextFormatType,
	TextNode,
} from "lexical";
import { Dispatch, SetStateAction } from "react";
import { UploadImagesToFolder } from "../../../wailsjs/go/main/App";
import { EditorBlockTypes } from "../../types";
import { createMarkdownExport } from "./MarkdownExport";
import { createMarkdownImport } from "./MarkdownImport";
import { INSERT_IMAGE_COMMAND } from "./plugins/image";

export type TextFormats =
	| null
	| "bold"
	| "italic"
	| "underline"
	| "strikethrough";

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
				case "img": {
					const filePaths = await UploadImagesToFolder(folder, note);
					for (const filePath of filePaths) {
						editor.update(() => {
							editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
								src: `http://localhost:5890/${filePath}`,
								alt: "test",
							});
						});
					}

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

function $isTargetWithinDecorator(target: HTMLElement): boolean {
	const node = $getNearestNodeFromDOMNode(target);
	return $isDecoratorNode(node);
}

export function overrideUpDownKeyCommand(
	event: KeyboardEvent,
	command: "up" | "down",
) {
	const selection = $getSelection();

	if (
		$isNodeSelection(selection) &&
		!$isTargetWithinDecorator(event.target as HTMLElement)
	) {
		const nodes = selection.getNodes();
		if (nodes.length > 0) {
			if (command === "down") {
				nodes[0].selectNext();
			} else {
				nodes[0].selectPrevious();
			}

			event.preventDefault();

			return true;
		}
	} else if ($isRangeSelection(selection)) {
		if (selection.focus.type === "text") {
			const parent = (selection.focus.getNode() as TextNode).getParent();
			if (parent) {
				const siblingNode =
					command === "up"
						? parent.getPreviousSibling()
						: parent.getNextSibling();
				if ($isDecoratorNode(siblingNode)) {
					const nodeSelection = $createNodeSelection();
					nodeSelection.add(siblingNode.getKey());
					$setSelection(nodeSelection);
					event.preventDefault();

					return true;
				}
			}
		}
		// Probably don't need below
		// else {
		// 	const possibleNode = $getAdjacentNode(selection.focus, true);
		// 	if ($isDecoratorNode(possibleNode)) {
		// 		const nodeSelection = $createNodeSelection();
		// 		nodeSelection.add(possibleNode.getKey());
		// 		$setSelection(nodeSelection);
		// 		event.preventDefault();

		// 		return true;
		// 	}
		// }
	}

	return false;
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
