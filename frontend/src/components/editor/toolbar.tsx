import { $isListNode, ListNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
	$getSelection,
	$isRangeSelection,
	CLEAR_HISTORY_COMMAND,
	FORMAT_TEXT_COMMAND,
	SELECTION_CHANGE_COMMAND,
} from "lexical";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import { navigate } from "wouter/use-browser-location";
import { GetNoteMarkdown } from "../../../wailsjs/go/main/App";
import { TextBold } from "../../icons/text-bold";
import { TextItalic } from "../../icons/text-italic";
import { TextStrikethrough } from "../../icons/text-strikethrough";
import { TextUnderline } from "../../icons/text-underline";
import { EditorBlockTypes } from "../../types";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import {
	$convertFromMarkdownStringCorrect,
	changeSelectedBlocksType,
} from "./utils";

const LOW_PRIORITY = 1;

interface ToolbarProps {
	folder: string;
	note: string;
	currentBlockType: EditorBlockTypes;
	setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>;
}

export function Toolbar({
	folder,
	note,
	currentBlockType,
	setCurrentBlockType,
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

	// Fetch note content locally
	useEffect(() => {
		GetNoteMarkdown(folder, note)
			.then((markdown) => {
				editor.setEditable(true);
				// You don't want a different note to access the same history when you switch notes
				editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
				editor.update(() => {
					$convertFromMarkdownStringCorrect(markdown, CUSTOM_TRANSFORMERS);
				});
			})
			.catch((e) => {
				console.error(e);
				navigate("/");
			});
	}, [folder, note, editor]);

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
		</nav>
	);
}
