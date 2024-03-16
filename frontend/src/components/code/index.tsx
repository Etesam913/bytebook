import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
	type LanguageName,
	langNames,
	loadLanguage,
} from "@uiw/codemirror-extensions-langs";
import { githubDark, githubLight } from "@uiw/codemirror-themes-all";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_LEFT_COMMAND,
	KEY_ARROW_RIGHT_COMMAND,
	KEY_ARROW_UP_COMMAND,
	UNDO_COMMAND,
} from "lexical";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	arrowKeyDecoratorNodeCommand,
	removeDecoratorNode,
} from "../../utils/commands";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { Dropdown } from "../dropdown";
import { MotionButton } from "../buttons";
import { Trash } from "../../icons/trash";
import { getDefaultButtonVariants } from "../../variants";
import { useAtomValue } from "jotai";
import { darkModeAtom } from "../../atoms";
import { motion } from "framer-motion";

const codeDropdownItems = [
	{ label: "Javascript", value: "javascript" },
	{ label: "Python", value: "python" },
	{ label: "Java", value: "java" },
	{ label: "C#", value: "c#" },
	{ label: "C++", value: "c++" },
	{ label: "C", value: "c" },
	{ label: "SQL", value: "sql" },
	{ label: "Go", value: "go" },
];

export function Code({
	code,
	nodeKey,
	defaultLanguage,
	onCodeChange,
	focus,
	setDefaultLanguage,
}: {
	code: string;
	nodeKey: string;
	defaultLanguage: string;
	onCodeChange: (code: string) => void;
	focus: boolean;
	setDefaultLanguage: (language: string) => void;
}) {
	const [editor] = useLexicalComposerContext();
	const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);
	const [prevLine, setPrevLine] = useState(1);
	const [currentLine, setCurrentLine] = useState(1);
	const [lineCount, setLineCount] = useState(1);
	const [isSelected, setSelected] = useLexicalNodeSelection(nodeKey);
	const codeMirrorContainerRef = useRef<HTMLDivElement>(null);

	const [language, setLanguage] = useState(defaultLanguage);

	const isDarkModeOn = useAtomValue(darkModeAtom);

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
			editor.registerCommand<KeyboardEvent>(
				KEY_ARROW_RIGHT_COMMAND,
				() => {
					return isSelected;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				KEY_ARROW_LEFT_COMMAND,
				() => {
					return isSelected;
				},
				COMMAND_PRIORITY_LOW,
			),
		);
	}, [
		editor,
		nodeKey,
		prevLine,
		currentLine,
		lineCount,
		isSelected,
		setSelected,
	]);

	if (chosenLanguage === null) {
		return <></>;
	}

	return (
		<div ref={codeMirrorContainerRef}>
			{isSelected && (
				<div className="flex justify-between items-center mb-1">
					<Dropdown
						buttonClassName="w-[7rem]"
						controlledValueIndex={codeDropdownItems.findIndex(
							({ value }) => value === language,
						)}
						variant="sm"
						items={codeDropdownItems}
						onChange={({ value }) => {
							setLanguage(value);
							setDefaultLanguage(value);
						}}
					/>

					<MotionButton
						onClick={() => {
							editor.update(() => {
								removeDecoratorNode(nodeKey);
							});
						}}
						{...getDefaultButtonVariants()}
					>
						<Trash />
					</MotionButton>
				</div>
			)}

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
				theme={isDarkModeOn ? githubDark : githubLight}
			/>
		</div>
	);
}
