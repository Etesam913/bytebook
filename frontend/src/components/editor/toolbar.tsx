import { $isListNode, ListNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
	$getSelection,
	$isRangeSelection,
	SELECTION_CHANGE_COMMAND,
} from "lexical";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import { EditorBlockTypes } from "../../types";

const LOW_PRIORITY = 1;

interface ToolbarProps {
	currentBlockType: EditorBlockTypes;
	setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>;
}

export function Toolbar({
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
				console.log(type);
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
			// editor.registerUpdateListener(({ editorState }) => {
			//   editorState.read(() => {
			//     updateToolbar();
			//   });
			// }),
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
		<nav className="flex flex-col justify-center">
			Toolbar
			<select value={currentBlockType} className="w-16">
				<option>h1</option>
				<option>h2</option>
				<option>h3</option>
				<option>paragraph</option>
				<option>ul</option>
				<option>ol</option>
			</select>
		</nav>
	);
}
