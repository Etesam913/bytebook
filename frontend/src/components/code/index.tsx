import CodeMirror, {
	Extension,
	ReactCodeMirrorRef,
	ViewUpdate,
} from "@uiw/react-codemirror";
import { githubDark } from "@uiw/codemirror-themes-all";
import {
	loadLanguage,
	langNames,
	LanguageName,
} from "@uiw/codemirror-extensions-langs";
import { useMemo, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { UNDO_COMMAND } from "lexical";

export function Code({
	code,
	language,
	onCodeChange,
	focus,
	goToPreviousElement,
	goToNextElement,
}: {
	code: string;
	language: string;
	onCodeChange: (code: string) => void;
	focus: boolean;
	goToPreviousElement: (foundPrevNodeCallback: () => void) => void;
	goToNextElement: (foundNextNodeCallback: () => void) => void;
}) {
	const [editor] = useLexicalComposerContext();
	const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);
	const [prevLine, setPrevLine] = useState(1);
	const [currentLine, setCurrentLine] = useState(1);
	const [lineCount, setLineCount] = useState(1);

	const chosenLanguage = useMemo(
		() =>
			langNames.includes(language as LanguageName)
				? loadLanguage(language as LanguageName)
				: loadLanguage("python"),
		[language],
	);

	if (chosenLanguage === null) {
		return <></>;
	}

	return (
		<div>
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

					if (e.key === "ArrowUp" && prevLine === 1 && currentLine === 1) {
						goToPreviousElement(() => {
							codeMirrorRef.current?.view?.contentDOM.blur();
						});
					}

					if (
						e.key === "ArrowDown" &&
						currentLine === lineCount &&
						prevLine === lineCount
					) {
						goToNextElement(() => {
							codeMirrorRef.current?.view?.contentDOM.blur();
						});
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
