import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
	type LanguageName,
	langNames,
	loadLanguage,
} from "@uiw/codemirror-extensions-langs";
import { githubDark, githubLight } from "@uiw/codemirror-themes-all";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { useAtomValue, useSetAtom } from "jotai";
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
import { darkModeAtom } from "../../atoms";
import { Play } from "../../icons/circle-play";
import { Trash } from "../../icons/trash";
import {
	arrowKeyDecoratorNodeCommand,
	removeDecoratorNode,
} from "../../utils/commands";
import { getDefaultButtonVariants } from "../../variants";
import { MotionButton } from "../buttons";
import { Dropdown } from "../dropdown";
import { RunCode } from "../../../wailsjs/go/main/App";

const codeDropdownItems = [
	{
		label: "Javascript",
		value: "javascript",
	},
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
			codeMirrorRef.current?.state?.update({
				selection: { anchor: 0, head: 0 },
			});
			codeMirrorRef.current?.view?.contentDOM.focus();
		}
	}, [isSelected]);

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<KeyboardEvent>(
				KEY_ARROW_UP_COMMAND,
				(e) => {
					console.log("ran");
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
						// Below fixes weird bug where going from code editor to image/video gave the <body> focus
						document.getElementById("content-editable-editor")?.focus();
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
		<div ref={codeMirrorContainerRef} className=" bg-zinc-100 p-2 rounded-md">
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
				</div>
			)}

			<div className="flex gap-1 justify-between">
				{isSelected && (
					<div className="flex flex-col justify-between pt-1 pr-0.5">
						<MotionButton
							className="p-0 bg-transparent border-0"
							onClick={() => {
								editor.update(() => {
									removeDecoratorNode(nodeKey);
								});
							}}
							{...getDefaultButtonVariants()}
						>
							<Trash />
						</MotionButton>

						<MotionButton
							onClick={() =>
								RunCode(language, code).then((r) => console.log(r))
							}
							className="p-0 bg-transparent border-0"
							{...getDefaultButtonVariants()}
						>
							<Play />
						</MotionButton>
					</div>
				)}
				<CodeMirror
					ref={codeMirrorRef}
					value={code}
					style={{ flex: 1 }}
					autoFocus={focus}
					onKeyDown={(e) => {
						if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
							editor.dispatchCommand(UNDO_COMMAND, undefined);
						}
					}}
					basicSetup={{
						lineNumbers: false,
						foldGutter: false,
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
		</div>
	);
}
