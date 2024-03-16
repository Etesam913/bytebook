import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
	type LanguageName,
	langNames,
	loadLanguage,
} from "@uiw/codemirror-extensions-langs";
import { githubDark } from "@uiw/codemirror-themes-all";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	UNDO_COMMAND,
} from "lexical";
import { useEffect, useMemo, useRef, useState } from "react";
import { arrowKeyDecoratorNodeCommand } from "../../utils/commands";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";

export function Code({
	code,
	nodeKey,
	language,
	onCodeChange,
	focus,
}: {
	code: string;
	nodeKey: string;
	language: string;
	onCodeChange: (code: string) => void;
	focus: boolean;
}) {
	const [editor] = useLexicalComposerContext();
	const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);
	const [prevLine, setPrevLine] = useState(1);
	const [currentLine, setCurrentLine] = useState(1);
	const [lineCount, setLineCount] = useState(1);
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const codeMirrorContainerRef = useRef<HTMLDivElement>(null);

	const chosenLanguage = useMemo(
		() =>
			langNames.includes(language as LanguageName)
				? loadLanguage(language as LanguageName)
				: loadLanguage("python"),
		[language],
	);

	useEffect(() => {
		if (isSelected) {
			codeMirrorRef.current?.view?.contentDOM.focus();
		}
	}, [isSelected]);

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<KeyboardEvent>(
				KEY_ARROW_UP_COMMAND,
				(e) => {
					console.log(prevLine, currentLine);
					if (prevLine === 1 && currentLine === 1) {
						codeMirrorRef.current?.view?.contentDOM.blur();
						console.log("go up");
						return arrowKeyDecoratorNodeCommand(e, nodeKey, true);
					}
					if (isSelected) return true;
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				KEY_ARROW_DOWN_COMMAND,
				(e) => {
					if (currentLine === lineCount && prevLine === lineCount) {
						console.log("go down");
						codeMirrorRef.current?.view?.contentDOM.blur();
						return arrowKeyDecoratorNodeCommand(e, nodeKey, false);
					}
					if (isSelected) return true;

					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					const clickedElem = e.target as HTMLElement;
					const codeMirrorContainer = codeMirrorContainerRef.current;
					if (
						clickedElem &&
						codeMirrorContainer &&
						codeMirrorContainer.contains(clickedElem)
					) {
						setSelected(true);
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
		);
	}, [editor, nodeKey, prevLine, currentLine, lineCount, isSelected]);

	if (chosenLanguage === null) {
		return <></>;
	}

	return (
		<div ref={codeMirrorContainerRef}>
			{language}
			<CodeMirror
				ref={codeMirrorRef}
				value={code}
				width="100%"
				autoFocus={focus}
				onKeyDown={(e) => {
					if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
						editor.dispatchCommand(UNDO_COMMAND, undefined);
					}
				}}
				onUpdate={(viewUpdate) => {
					setPrevLine(currentLine);
					setCurrentLine(
						viewUpdate.state.doc.lineAt(viewUpdate.state.selection.main.head)
							.number,
					);
					setLineCount(viewUpdate.state.doc.lines);
				}}
				onChange={(text) => {
					onCodeChange(text);
				}}
				extensions={[chosenLanguage]}
				theme={githubDark}
			/>
		</div>
	);
}
