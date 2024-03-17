import { $isListNode, ListNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import { motion } from "framer-motion";
import {
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_EDITOR,
	FORMAT_TEXT_COMMAND,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	SELECTION_CHANGE_COMMAND,
	type TextFormatType,
} from "lexical";
import { useEffect, useState } from "react";
import { TextBold } from "../../icons/text-bold";
import { TextItalic } from "../../icons/text-italic";
import { TextStrikethrough } from "../../icons/text-strikethrough";
import { TextUnderline } from "../../icons/text-underline";
import type { EditorBlockTypes } from "../../types";
import { cn } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { Dropdown } from "../dropdown";
import { useNoteMarkdown } from "./hooks";
import {
	type TextFormats,
	changeSelectedBlocksType,
	handleToolbarTextFormattingClick,
	overrideUpDownKeyCommand,
} from "./utils";

const LOW_PRIORITY = 1;

interface ToolbarProps {
	folder: string;
	note: string;
	disabled: boolean;
}

const blockTypesDropdownItems = [
	{ label: "Header 1", value: "h1" },
	{ label: "Header 2", value: "h2" },
	{ label: "Header 3", value: "h3" },
	{ label: "Paragraph", value: "paragraph" },
	{ label: "Unordered List", value: "ul" },
	{ label: "Ordered List", value: "ol" },
	{ label: "Image", value: "img" },
];

export function Toolbar({ folder, note, disabled }: ToolbarProps) {
	const [editor] = useLexicalComposerContext();

	const [currentBlockType, setCurrentBlockType] =
		useState<EditorBlockTypes>("paragraph");
	const [currentSelectionFormat, setCurrentSelectionFormat] = useState<
		TextFormatType[]
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
				setCurrentBlockType(type);
			}
			// Consists of blocks like paragraph, quote, code, etc.
			else {
				setCurrentBlockType(element.getType());
			}
		}
	}

	useNoteMarkdown(editor, folder, note, setCurrentSelectionFormat);
	// useImageListener(editor);

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
			editor.registerCommand(
				KEY_ARROW_UP_COMMAND,
				(event) => overrideUpDownKeyCommand(event, "up"),
				COMMAND_PRIORITY_EDITOR,
			),
			// editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, event);
			editor.registerCommand(
				KEY_ARROW_DOWN_COMMAND,
				(event) => overrideUpDownKeyCommand(event, "down"),
				COMMAND_PRIORITY_EDITOR,
			),
		);
	}, [editor]);

	return (
		<nav
			className={cn(
				"flex flex-wrap gap-3 py-2 ml-[-4px] pl-1 border-b-[1px] border-b-zinc-200 dark:border-b-zinc-700",
				disabled && "pointer-events-none",
			)}
		>
			<Dropdown
				controlledValueIndex={blockTypesDropdownItems.findIndex(
					(v) => v.value === currentBlockType,
				)}
				onChange={({ value }) =>
					changeSelectedBlocksType(editor, value, folder, note)
				}
				items={blockTypesDropdownItems}
				buttonClassName="w-[10rem]"
				disabled={disabled}
			/>

			<motion.button
				{...getDefaultButtonVariants(disabled, 1.15, 0.95, 1.15)}
				disabled={disabled}
				className={cn(
					"p-1 rounded-md transition-colors duration-300 disabled:opacity-30",
					currentSelectionFormat.includes("bold") &&
						!disabled &&
						"button-invert",
				)}
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
					handleToolbarTextFormattingClick(
						currentSelectionFormat,
						setCurrentSelectionFormat,
						"bold",
					);
				}}
				type="button"
			>
				<TextBold />
			</motion.button>

			<motion.button
				{...getDefaultButtonVariants(disabled, 1.15, 0.95, 1.15)}
				disabled={disabled}
				className={cn(
					"p-1 rounded-md transition-colors duration-300 disabled:opacity-30",
					currentSelectionFormat.includes("italic") &&
						!disabled &&
						"button-invert",
				)}
				type="button"
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
					handleToolbarTextFormattingClick(
						currentSelectionFormat,
						setCurrentSelectionFormat,
						"italic",
					);
				}}
			>
				<TextItalic />
			</motion.button>

			<motion.button
				{...getDefaultButtonVariants(disabled, 1.15, 0.95, 1.15)}
				disabled={disabled}
				className={cn(
					"p-1 rounded-md transition-colors duration-300 disabled:opacity-30",
					currentSelectionFormat.includes("underline") &&
						!disabled &&
						"button-invert",
				)}
				type="button"
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
					handleToolbarTextFormattingClick(
						currentSelectionFormat,
						setCurrentSelectionFormat,
						"underline",
					);
				}}
			>
				<TextUnderline />
			</motion.button>

			<motion.button
				{...getDefaultButtonVariants(disabled, 1.15, 0.95, 1.15)}
				className={cn(
					"p-1 rounded-md transition-colors duration-300 disabled:opacity-30",
					currentSelectionFormat.includes("strikethrough") &&
						!disabled &&
						"button-invert",
				)}
				disabled={disabled}
				type="button"
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
					handleToolbarTextFormattingClick(
						currentSelectionFormat,
						setCurrentSelectionFormat,
						"strikethrough",
					);
				}}
			>
				<TextStrikethrough />
			</motion.button>
		</nav>
	);
}
