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
import { useEffect, useState } from "react";
import { TextBold } from "../../icons/text-bold";
import { TextItalic } from "../../icons/text-italic";
import { TextStrikethrough } from "../../icons/text-strikethrough";
import { TextUnderline } from "../../icons/text-underline";
import { EditorBlockTypes } from "../../types";
import { cn } from "../../utils/string-formatting";
import { useImageListener, useNoteMarkdown } from "./hooks";
import { changeSelectedBlocksType } from "./utils";

const LOW_PRIORITY = 1;

interface ToolbarProps {
	folder: string;
	note: string;
}
type TextFormats = null | "bold" | "italic" | "underline" | "strikethrough";

export function Toolbar({ folder, note }: ToolbarProps) {
	const [editor] = useLexicalComposerContext();
	const [currentBlockType, setCurrentBlockType] = useState<EditorBlockTypes>();
	const [currentSelectionFormat, setCurrentSelectionFormat] = useState<
		TextFormats[]
	>([]);

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

			setCurrentSelectionFormat(selectionTextFormats);

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
				setCurrentBlockType(element.getType());
			}
		}
	}

	useNoteMarkdown(editor, folder, note);
	useImageListener(editor);

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
		<nav className="flex flex-wrap gap-3 py-2 ml-[-4px] pl-1 border-b-[1px] border-b-zinc-200 dark:border-b-zinc-700">
			<select
				onChange={(e) =>
					changeSelectedBlocksType(editor, e.target.value, folder, note)
				}
				value={currentBlockType}
				className="w-16"
			>
				<option value="h1">h1</option>
				<option value="h2">h2</option>
				<option value="h3">h3</option>
				<option value="paragraph">paragraph</option>
				<option value="ul">ul</option>
				<option value="ol">ol</option>
				<option value="img">Image</option>
			</select>
			<button
				className={cn(
					"p-1 rounded-md transition-colors duration-300",
					currentSelectionFormat.includes("bold") && "button-invert",
				)}
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
				type="button"
			>
				<TextBold />
			</button>

			<button
				className={cn(
					"p-1 rounded-md transition-colors duration-300",
					currentSelectionFormat.includes("italic") && "button-invert",
				)}
				type="button"
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
			>
				<TextItalic />
			</button>

			<button
				className={cn(
					"p-1 rounded-md transition-colors duration-300",
					currentSelectionFormat.includes("underline") && "button-invert",
				)}
				type="button"
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
			>
				<TextUnderline />
			</button>

			<button
				className={cn(
					"p-1 rounded-md transition-colors duration-300",
					currentSelectionFormat.includes("strikethrough") && "button-invert",
				)}
				type="button"
				onClick={() =>
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
				}
			>
				<TextStrikethrough />
			</button>
		</nav>
	);
}
