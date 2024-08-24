import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";

import {
	type CodeEditorRef,
	SandpackFileExplorer,
	type SandpackFiles,
	SandpackLayout,
} from "@codesandbox/sandpack-react";
import { SandpackCodeEditor, useSandpack } from "@codesandbox/sandpack-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { motion } from "framer-motion";
import { useSetAtom } from "jotai";
import {
	type Dispatch,
	type SetStateAction,
	type SyntheticEvent,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { languageToTemplate, nonTemplateLanguageToExtension } from ".";
import type { CodeResponse } from "../../../bindings/github.com/etesam913/bytebook/index";
import { RunCode } from "../../../bindings/github.com/etesam913/bytebook/nodeservice";
import { getDefaultButtonVariants } from "../../animations";
import { dialogDataAtom } from "../../atoms";
import { ExitFullscreen } from "../../icons/arrows-reduce-diagonal";
import { BracketsSquareDots } from "../../icons/brackets-square-dots";
import { Play } from "../../icons/circle-play";
import { FloppyDisk } from "../../icons/floppy-disk";
import { Fullscreen } from "../../icons/fullscreen";
import { Loader } from "../../icons/loader";
import { Trash } from "../../icons/trash";
import { removeDecoratorNode } from "../../utils/commands";
import { cn } from "../../utils/string-formatting";
import { MotionButton } from "../buttons";
import { DialogErrorText } from "../dialog";
import { Input } from "../input";
import { useCodeEditorFocus } from "./hooks";

export function CodeViewer({
	language,
	nodeKey,
	commandWrittenToNode,
	writeCommandToNode,
	codeResult,
	setCodeResult,
	writeDataToNode,
	isSelected,
	setIsSelected,
	isFullscreen,
	setIsFullscreen,
}: {
	language: string;
	nodeKey: string;
	commandWrittenToNode: string;
	writeCommandToNode: (arg0: string) => void;
	codeResult: CodeResponse;
	setCodeResult: Dispatch<SetStateAction<CodeResponse>>;
	writeDataToNode: (files: SandpackFiles, result: CodeResponse) => void;
	isSelected: boolean;
	setIsSelected: (arg0: boolean) => void;
	isFullscreen: boolean;
	setIsFullscreen: Dispatch<SetStateAction<boolean>>;
}) {
	const [editor] = useLexicalComposerContext();
	const { sandpack } = useSandpack();
	const { files, activeFile } = sandpack;
	/*
	 Code only has to be run locally if it's a non-template language.
	 Sandpack can handle running template languages by itself.
	*/
	const [isCodeRunning, setIsCodeRunning] = useState(false);

	const code = useMemo(() => files[activeFile].code, [sandpack.files]);

	const codeMirrorRef = useRef<CodeEditorRef | null>(null);

	const setDialogData = useSetAtom(dialogDataAtom);

	function handleRunCode(e?: SyntheticEvent) {
		if (e) {
			e.stopPropagation();
		}
		if (isCodeRunning) {
			toast.info("The code is already running...", {
				duration: 3000,
				closeButton: true,
			});
			return;
		}
		setIsCodeRunning(true);
		RunCode(language, code, commandWrittenToNode).then((res) => {
			setCodeResult(res);
			setIsCodeRunning(false);
			editor.update(() => {
				writeDataToNode(files, res);
			});
		});
	}

	useCodeEditorFocus(codeMirrorRef, isSelected, setIsSelected);

	return (
		<SandpackLayout
			className="flex-1"
			onKeyDown={(e) => {
				setIsSelected(true);
				if (e.key === "Enter" && e.shiftKey) handleRunCode();
				// Prevent the default behavior of the key if it's a special key
				else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
					e.stopPropagation();
				} else if (
					e.metaKey &&
					(e.key === "c" || e.key === "x" || e.key === "a" || e.key === "f")
				) {
					e.stopPropagation();
				} else if (e.key === "Escape" && isFullscreen) {
					e.preventDefault();
				}
			}}
			onKeyUp={() => {
				editor.update(() => {
					writeDataToNode(files, codeResult);
				});
			}}
		>
			{language in languageToTemplate && (
				<SandpackFileExplorer
					style={{ height: isFullscreen ? "100%" : "auto" }}
				/>
			)}
			<SandpackCodeEditor
				ref={codeMirrorRef}
				style={{ height: isFullscreen ? "100%" : "auto" }}
				showTabs
				showLineNumbers={false}
				showInlineErrors
				closableTabs
				extensions={[autocompletion()]}
				key={activeFile}
				extensionsKeymap={completionKeymap}
				additionalLanguages={[
					{
						name: "python",
						extensions: [nonTemplateLanguageToExtension.python],
						language: python(),
					},
					{
						name: "java",
						extensions: [nonTemplateLanguageToExtension.java],
						language: java(),
					},
					{
						name: "go",
						extensions: [nonTemplateLanguageToExtension.go],
						language: go(),
					},
					{
						name: "rust",
						extensions: [nonTemplateLanguageToExtension.go],
						language: rust(),
					},
					{
						name: "c++",
						extensions: [nonTemplateLanguageToExtension.cpp],
						language: cpp(),
					},
				]}
			/>

			<motion.button
				className={cn(
					"absolute top-0 right-10 h-10 text-zinc-700 dark:text-zinc-200",
					isFullscreen && "top-1.5",
				)}
				{...getDefaultButtonVariants()}
				onClick={() => {
					editor.update(() => {
						removeDecoratorNode(nodeKey);
					});
				}}
			>
				<Trash />
			</motion.button>

			<motion.button
				className={cn(
					"absolute top-0 right-2 h-10 text-zinc-700 dark:text-zinc-200",
					isFullscreen && "top-1.5",
				)}
				id="fullscreen-button"
				title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
				{...getDefaultButtonVariants()}
				onClick={() => {
					setIsFullscreen((prev) => !prev);
					const codeMirrorInstance = codeMirrorRef.current?.getCodemirror();
					if (codeMirrorInstance) {
						// For some reason this timeout is needed for the isSelected to not be overriden
						setTimeout(() => {
							setIsSelected(true);
						}, 50);
						codeMirrorInstance.focus();
					}
				}}
			>
				{isFullscreen ? <ExitFullscreen /> : <Fullscreen />}
			</motion.button>

			{language in nonTemplateLanguageToExtension && (
				<motion.button
					className={cn(
						"absolute top-0 right-[4.5rem] h-10 text-zinc-700 dark:text-zinc-200",
						isFullscreen && "top-1.5",
					)}
					{...getDefaultButtonVariants()}
					onClick={() =>
						setDialogData({
							isOpen: true,
							title: `${language} Settings`,
							onClose: () => {
								const codeMirrorInstance =
									// @ts-ignore - EditorView is not exposed in the codemirror types for some reason
									codeMirrorRef.current?.getCodemirror() as EditorView;
								if (codeMirrorInstance) {
									codeMirrorInstance.focus();
								}
							},
							children: (errorText) => (
								<>
									<fieldset className="flex flex-col">
										<Input
											label="Run Command"
											labelProps={{ htmlFor: "run-command" }}
											inputProps={{
												type: "text",
												id: "run-command",
												name: "run-command",
												defaultValue: commandWrittenToNode,
												className: "font-code text-sm",
											}}
										/>
										<DialogErrorText errorText={errorText} />
									</fieldset>
									<MotionButton
										type="submit"
										{...getDefaultButtonVariants()}
										className="w-[calc(100%-1.5rem)] mx-auto justify-center"
									>
										<span>Save Code Settings</span> <FloppyDisk />
									</MotionButton>
								</>
							),
							onSubmit: async (e, setErrorText) => {
								const formData = new FormData(e.target as HTMLFormElement);
								const runCommand = formData.get("run-command");

								if (runCommand && typeof runCommand === "string") {
									if (runCommand.trim().length === 0) {
										setErrorText("Run command cannot be empty");
										return false;
									}
									// resetDialogState(setErrorText, setDialogData);
									writeCommandToNode(runCommand);
									return true;
								}
								return false;
							},
						})
					}
				>
					<BracketsSquareDots />
				</motion.button>
			)}

			{language in nonTemplateLanguageToExtension && (
				<motion.button
					className="absolute bottom-2 right-2 bg-opacity-85 border border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 p-1.5 rounded-md"
					{...getDefaultButtonVariants()}
					onClick={handleRunCode}
					disabled={isCodeRunning}
					title="Run Code"
				>
					{isCodeRunning ? <Loader /> : <Play title="Run Code" />}
				</motion.button>
			)}
		</SandpackLayout>
	);
}
