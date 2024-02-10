import { $isListNode, ListNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
	$getSelection,
	$isRangeSelection,
	FORMAT_TEXT_COMMAND,
	SELECTION_CHANGE_COMMAND,
} from "lexical";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import { EditorBlockTypes } from "../../types";
import { changeSelectedBlocksType } from "./utils";
import TextBold from "../../icons/text-bold";
import TextItalic from "../../icons/text-italic";
import TextUnderline from "../../icons/text-underline";
import TextStrikethrough from "../../icons/text-strikethrough";
import { $convertToMarkdownString } from "@lexical/markdown";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import { StoreMarkdown, WriteNote } from "../../../wailsjs/go/main/App";

const LOW_PRIORITY = 1;

interface ToolbarProps {
	currentBlockType: EditorBlockTypes;
	setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>;
	noteTitle: string;
}

export function Toolbar({
	currentBlockType,
	setCurrentBlockType,
	noteTitle,
}: ToolbarProps) {
	const [editor] = useLexicalComposerContext();

	function updateToolbar() {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) {
			const anchorNode = selection.anchor.getNode();
			const element =
				anchorNode.getKey() === "root"
					? anchorNode
					: anchorNode.getTopLevelElementOrThrow();
			const elementKey = element.getKey();
			const elementDOM = editor.getElementByKey(elementKey);
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
				setCurrentBlockType(type);
			}
			// Consists of blocks like paragraph, quote, code, etc.
			else {
				const otherElementType = element.getType();
				setCurrentBlockType(otherElementType);
			}
		}
	}

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				(_payload, newEditor) => {
					updateToolbar();
					return false;
				},
				LOW_PRIORITY,
			),
		);
	}, [editor]);

	return (
		<nav className="flex gap-3 p-2">
			<select
				onChange={(e) => changeSelectedBlocksType(editor, e.target.value)}
				value={currentBlockType}
				className="w-16"
			>
				<option value="h1">h1</option>
				<option value="h2">h2</option>
				<option value="h3">h3</option>
				<option value="paragraph">paragraph</option>
				<option value="ul">ul</option>
				<option value="ol">ol</option>
			</select>
			<button
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
				type="button"
			>
				<TextBold />
			</button>

			<button
				type="button"
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
			>
				<TextItalic />
			</button>

			<button
				type="button"
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
			>
				<TextUnderline />
			</button>

			<button
				type="button"
				onClick={() =>
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
				}
			>
				<TextStrikethrough />
			</button>

			<button
				type="button"
				className="ml-auto"
				onClick={() => {
					editor.update(() => {
						const markdown = $convertToMarkdownString(CUSTOM_TRANSFORMERS);
						WriteNote(noteTitle, markdown);
					});
				}}
			>
				save
			</button>

			<button
				onClick={() =>
					editor.update(() => {
						const markdown = $convertToMarkdownString(CUSTOM_TRANSFORMERS);
						StoreMarkdown(markdown);
					})
				}
				type="button"
			>
				download
			</button>
		</nav>
	);
}
