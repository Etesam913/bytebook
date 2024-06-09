import type { CodeEditorRef } from "@codesandbox/sandpack-react";
import { mergeRegister } from "@lexical/utils";
import {
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
	CUT_COMMAND,
	type LexicalEditor,
	PASTE_COMMAND,
} from "lexical";
import { type RefObject, useEffect } from "react";

export function useCodeEditorCommands(
	editor: LexicalEditor,
	isSelected: boolean,
	nodeRef: RefObject<HTMLDivElement>,
	setSelected: (arg0: boolean) => void,
	clearSelection: () => void,
) {
	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					const node = nodeRef.current;
					const clickedElem = e.target as HTMLElement;
					// For some reason, the tabs do not return true for `node?.contains(clickedElem)`. It's a weird edge case
					if (
						clickedElem.getAttribute("role") === "tab" ||
						node?.contains(clickedElem)
					) {
						if (!e.shiftKey) clearSelection();
						setSelected(true);
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				CUT_COMMAND,
				() => {
					return isSelected;
				},
				COMMAND_PRIORITY_LOW,
			),
			// Prevents pasting on an empty line from removing the component
			editor.registerCommand<KeyboardEvent>(
				PASTE_COMMAND,
				() => {
					return isSelected;
				},
				COMMAND_PRIORITY_LOW,
			),
		);
	}, [editor, isSelected, nodeRef]);
}

/**
The `setInterval` had to be used because I couldn't find an easy way for
`cmInstance` to not be undefined
*/
export function useCodeEditorFocus(
	codeMirrorRef: React.RefObject<CodeEditorRef>,
	focus: boolean,
	setIsSelected: (arg0: boolean) => void,
) {
	useEffect(() => {
		if (!focus) return;
		let intervalId: number | undefined = undefined;
		// @ts-expect-error For some reason sandpack does not export the EditorView type
		let cmInstance: EditorView | null = null;

		intervalId = setInterval(() => {
			cmInstance = codeMirrorRef.current?.getCodemirror();

			if (cmInstance) {
				clearInterval(intervalId);
				if (focus) {
					cmInstance.focus();
					setIsSelected(true);
				}
				// cmInstance is defined, you can use it here
			}
		}, 100); // run every 100ms

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	}, [focus]);
}
