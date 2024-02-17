import { $isListNode, ListNode } from "@lexical/list";
import { $convertToMarkdownString } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
	$getSelection,
	$isRangeSelection,
	FORMAT_TEXT_COMMAND,
	SELECTION_CHANGE_COMMAND,
} from "lexical";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { WriteNote } from "../../../wailsjs/go/main/App";
import { CodePullRequest } from "../../icons/code-pull-request";
import { FloppyDisk } from "../../icons/floppy-disk";
import { TextBold } from "../../icons/text-bold";
import { TextItalic } from "../../icons/text-italic";
import { TextStrikethrough } from "../../icons/text-strikethrough";
import { TextUnderline } from "../../icons/text-underline";
import { EditorBlockTypes } from "../../types";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import { changeSelectedBlocksType } from "./utils";

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
	const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
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
				onClick={() => setIsCommitModalOpen(true)}
			>
				<CodePullRequest />
			</button>

			<button
				type="button"
				onClick={() => {
					editor.update(() => {
						const markdown = $convertToMarkdownString(CUSTOM_TRANSFORMERS);
						WriteNote(noteTitle, markdown);
					});
				}}
			>
				<FloppyDisk />
			</button>

			<dialog
				open={isCommitModalOpen}
				onClose={() => setIsCommitModalOpen(false)}
			>
				<form method="dialog" className="flex flex-col gap-2 p-2 shadow-lg">
					<label htmlFor="remote-url">remote url</label>
					<input id="remote-url" className="p-1 bg-slate-100" />
					<button
						className=" bg-slate-500  text-white"
						type="submit"
						onClick={() => setIsCommitModalOpen(false)}
					>
						close
					</button>
				</form>
			</dialog>
		</nav>
	);
}
