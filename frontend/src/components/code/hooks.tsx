import {
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
	COPY_COMMAND,
	CUT_COMMAND,
	LexicalEditor,
	PASTE_COMMAND,
} from "lexical";
import { mergeRegister } from "@lexical/utils";
import { useEffect } from "react";

export function useCodeEditorCommands(
	editor: LexicalEditor,
	nodeKey: string,
	isSelected: boolean,
	setIsSelected: (isSelected: boolean) => void,
	clearSelection: () => void,
	codeMirrorContainerRef: React.RefObject<HTMLElement>,
) {
	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					const clickedElem = e.target as HTMLElement;
					const codeMirrorContainer = codeMirrorContainerRef.current;
					console.log(
						clickedElem,
						codeMirrorContainer,
						codeMirrorContainer?.contains(clickedElem),
					);
					if (
						clickedElem &&
						codeMirrorContainer &&
						codeMirrorContainer.contains(clickedElem)
					) {
						clearSelection();
						setIsSelected(true);
						return true;
					}
					return isSelected;
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
			// editor.registerCommand<KeyboardEvent>(
			// 	KEY_ESCAPE_COMMAND,
			// 	() => {
			// 		codeMirrorRef.current?.view?.contentDOM.blur();
			// 		return escapeKeyDecoratorNodeCommand(nodeKey);
			// 	},
			// 	COMMAND_PRIORITY_LOW,
			// ),
		);
	}, [
		editor,
		nodeKey,
		isSelected,
		setIsSelected,
		clearSelection,
		codeMirrorContainerRef,
	]);
}
