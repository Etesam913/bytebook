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
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	ElementNode,
	LexicalEditor,
} from "lexical";
import { EditorBlockTypes } from "../../types";
import { createMarkdownExport } from "./MarkdownExport";
import { createMarkdownImport } from "./MarkdownImport";

/**
 * Gets a selection and formats the blocks to `newBlockType`
 */
export function changeSelectedBlocksType(
	editor: LexicalEditor,
	newBlockType: EditorBlockTypes,
) {
	editor.update(() => {
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
			}
		}
	});
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
