import { CodeEditorRef } from "@codesandbox/sandpack-react";
import { mergeRegister } from "@lexical/utils";
import {
	COMMAND_PRIORITY_LOW,
	COPY_COMMAND,
	CUT_COMMAND,
	type LexicalEditor,
	PASTE_COMMAND,
} from "lexical";
import { useEffect } from "react";

export function useCodeEditorCommands(
	editor: LexicalEditor,
	isSelected: boolean,
) {
	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<KeyboardEvent>(
				CUT_COMMAND,
				() => {
					return isSelected;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				COPY_COMMAND,
				() => {
					return isSelected;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				PASTE_COMMAND,
				() => {
					return isSelected;
				},
				COMMAND_PRIORITY_LOW,
			),
		);
	}, [editor, isSelected]);
}

/**
The `setInterval` had to be used because I couldn't find an easy way for
`cmInstance` to not be undefined
*/
export function useCodeEditorFocus(
	codeMirrorRef: React.RefObject<CodeEditorRef>,
	focus: boolean,
) {
	useEffect(() => {
		let intervalId: number | undefined = undefined;
		// @ts-expect-error For some reason sandpack does not export the EditorView type
		let cmInstance: EditorView | null = null;

		intervalId = setInterval(() => {
			cmInstance = codeMirrorRef.current?.getCodemirror();

			if (cmInstance) {
				clearInterval(intervalId);
				if (focus) {
					cmInstance.focus();
				}
				// cmInstance is defined, you can use it here
			}
		}, 100); // run every 100ms

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	}, []);
}
