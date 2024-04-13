import {
	$getSelection,
	$isRangeSelection,
	type LexicalEditor,
	type TextFormatType,
} from "lexical";
import type { Dispatch, SetStateAction } from "react";
import type { TextFormats } from "./utils";

export function updateToolbar(
	editor: LexicalEditor,
	setDisabled: Dispatch<SetStateAction<boolean>>,
) {
	const selection = $getSelection();
	if ($isRangeSelection(selection)) {
		setDisabled(false);
		const anchorNode = selection.anchor.getNode();
		const element =
			anchorNode.getKey() === "root"
				? anchorNode
				: anchorNode.getTopLevelElementOrThrow();
		const elementKey = element.getKey();
		const elementDOM = editor.getElementByKey(elementKey);
		const selectionTextFormats: TextFormats[] = [];
		if (selection.hasFormat("bold")) {
			selectionTextFormats.push("bold");
		}
		if (selection.hasFormat("italic")) {
			selectionTextFormats.push("italic");
		}
		if (selection.hasFormat("underline")) {
			selectionTextFormats.push("underline");
		}
		if (selection.hasFormat("strikethrough")) {
			selectionTextFormats.push("strikethrough");
		}

		setCurrentSelectionFormat(selectionTextFormats as TextFormatType[]);

		if (!elementDOM) return;

		// Consists of headings like h1, h2, h3, etc.
		if ($isHeadingNode(element)) {
			const headingTag = element.getTag();
			setCurrentBlockType(headingTag);
		}

		// Consists of lists, like ol and ul
		else if ($isListNode(element)) {
			const parentList = $getNearestNodeOfType(anchorNode, ListNode);
			const type = parentList ? parentList.getTag() : element.getTag();
			if (element.getListType() === "check") {
				setCurrentBlockType("check");
			} else {
				setCurrentBlockType(type);
			}
		}

		// Consists of blocks like paragraph, quote, code, etc.
		else {
			setCurrentBlockType(element.getType());
		}
	} else if ($isNodeSelection(selection)) {
		setDisabled(true);
	}
}
