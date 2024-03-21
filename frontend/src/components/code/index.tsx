import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
	type LanguageName,
	langNames,
	loadLanguage,
} from "@uiw/codemirror-extensions-langs";
import { basicDark, githubLight } from "@uiw/codemirror-themes-all";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { useAtomValue } from "jotai";
import {
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
	CUT_COMMAND,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	KEY_ESCAPE_COMMAND,
} from "lexical";
import { useEffect, useMemo, useRef, useState } from "react";
import { RunCode } from "../../../wailsjs/go/main/App";
import { darkModeAtom } from "../../atoms";
import { Play } from "../../icons/circle-play";
import { Trash } from "../../icons/trash";
import {
	arrowKeyDecoratorNodeCommand,
	escapeKeyDecoratorNodeCommand,
	removeDecoratorNode,
} from "../../utils/commands";
import { getDefaultButtonVariants } from "../../variants";
import { MotionButton } from "../buttons";
import { Dropdown } from "../dropdown";
import { codeDropdownItems, languageToCommandMap } from "../../utils/code";
import { BracketsSquareDots } from "../../icons/brackets-square-dots";
import { CodeDialog } from "./code-dialog";
import { AnimatePresence } from "framer-motion";
import { Loader } from "../../icons/loader";

export function Code({
	code,
	nodeKey,
	languageWrittenToNode,
	writeLanguageToNode,
	commandWrittenToNode,
	writeCommandToNode,
	onCodeChange,
	focus,
}: {
	code: string;
	nodeKey: string;
	languageWrittenToNode: string;
	commandWrittenToNode: string;
	focus: boolean;
	onCodeChange: (code: string) => void;
	writeCommandToNode: (language: string) => void;
	writeLanguageToNode: (language: string) => void;
}) {
	const [editor] = useLexicalComposerContext();

	const codeMirrorContainerRef = useRef<HTMLDivElement>(null);
	const codeMirrorRef = useRef<ReactCodeMirrorRef>();
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [language, setLanguage] = useState(languageWrittenToNode);
	const [command, setCommand] = useState(commandWrittenToNode);
	const isDarkModeOn = useAtomValue(darkModeAtom);
	const [isCodeSettingsOpen, setIsCodeSettingsOpen] = useState(false);

	const [isCodeRunning, setIsCodeRunning] = useState(false);
	const [codeResult, setCodeResult] = useState<{
		message: string;
		success: boolean;
	}>();

	const chosenLanguage = useMemo(
		() =>
			langNames.includes(languageWrittenToNode as LanguageName)
				? loadLanguage(languageWrittenToNode as LanguageName)
				: null,
		[languageWrittenToNode],
	);

	function editorRefCallback(editor: ReactCodeMirrorRef) {
		if (
			!codeMirrorRef.current &&
			editor?.editor &&
			editor?.state &&
			editor?.view
		) {
			codeMirrorRef.current = editor;
		}
	}

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
					return arrowKeyDecoratorNodeCommand(e, nodeKey, true);
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				KEY_ARROW_DOWN_COMMAND,
				(e) => {
					return arrowKeyDecoratorNodeCommand(e, nodeKey, false);
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
						clearSelection();
						setSelected(true);
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				CUT_COMMAND,
				(e) => {
					return isSelected;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				KEY_ESCAPE_COMMAND,
				(e) => {
					codeMirrorRef.current?.view?.contentDOM.blur();
					return escapeKeyDecoratorNodeCommand(nodeKey);
				},
				COMMAND_PRIORITY_LOW,
			),
		);
	}, [editor, nodeKey, isSelected, setSelected, clearSelection]);

	if (chosenLanguage === null) {
		return <></>;
	}

	return (
		<>
			<AnimatePresence>
				{isCodeSettingsOpen && (
					<CodeDialog
						isCodeSettingsOpen={isCodeSettingsOpen}
						setIsCodeSettingsOpen={setIsCodeSettingsOpen}
						command={command}
						setCommand={setCommand}
						writeCommandToNode={writeCommandToNode}
					/>
				)}
			</AnimatePresence>
			<div
				ref={codeMirrorContainerRef}
				className="bg-zinc-50 dark:bg-zinc-750 border-[1.25px] border-zinc-300 dark:border-zinc-600 p-2 rounded-md flex flex-col gap-2 my-2"
			>
				{isSelected && (
					<div className="flex justify-between items-center flex-wrap-reverse gap-2">
						<span className="flex gap-2">
							<MotionButton
								{...getDefaultButtonVariants()}
								disabled={isCodeRunning}
								onClick={(e) => {
									e.stopPropagation();
									setIsCodeRunning(true);
									RunCode(languageWrittenToNode, code).then((r) => {
										setCodeResult(r);
										setIsCodeRunning(false);
									});
								}}
							>
								{isCodeRunning ? <Loader /> : <Play />}
							</MotionButton>
							<Dropdown
								className="w-36"
								buttonClassName="w-full"
								controlledValueIndex={codeDropdownItems.findIndex(
									({ value }) => value === language,
								)}
								variant="sm"
								items={codeDropdownItems}
								onChange={({ value }) => {
									writeLanguageToNode(value);
									setLanguage(value);
									const newCommand =
										value in languageToCommandMap
											? languageToCommandMap[value]
											: "node";
									setCommand(newCommand);
									writeCommandToNode(newCommand);
								}}
							/>
						</span>
						<span className="flex gap-2">
							<MotionButton
								{...getDefaultButtonVariants()}
								onClick={() => setIsCodeSettingsOpen(true)}
							>
								<BracketsSquareDots />
							</MotionButton>
							<MotionButton
								{...getDefaultButtonVariants()}
								onClick={() => {
									editor.update(() => {
										removeDecoratorNode(nodeKey);
									});
								}}
							>
								<Trash />
							</MotionButton>
						</span>
					</div>
				)}

				<CodeMirror
					ref={editorRefCallback}
					value={code}
					style={{ flex: 1, borderRadius: "0.5rem", overflow: "hidden" }}
					autoFocus={focus}
					onKeyDown={(e) => {
						if (e.key !== "Escape") {
							e.stopPropagation();
						} else {
							e.preventDefault();
						}
					}}
					basicSetup={{
						lineNumbers: false,
						foldGutter: false,
					}}
					onChange={(text) => {
						onCodeChange(text);
					}}
					extensions={[chosenLanguage]}
					theme={isDarkModeOn ? basicDark : githubLight}
				/>

				{codeResult && (
					<div className="w-full bg-zinc-900 px-3 py-2 rounded-md font-code text-sm">
						{codeResult.message}
					</div>
				)}
			</div>
		</>
	);
}
