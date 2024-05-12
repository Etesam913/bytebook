import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import {
	type CodeEditorRef,
	SandpackFileExplorer,
	type SandpackFiles,
	SandpackLayout,
} from "@codesandbox/sandpack-react";
import { SandpackCodeEditor, useSandpack } from "@codesandbox/sandpack-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { motion } from "framer-motion";
import {
	type Dispatch,
	type SetStateAction,
	type SyntheticEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { languageToTemplate, nonTemplateLanguageToExtension } from ".";
import { RunCode } from "../../../bindings/main/NodeService";
import { getDefaultButtonVariants } from "../../animations";
import { BracketsSquareDots } from "../../icons/brackets-square-dots";
import { Play } from "../../icons/circle-play";
import { Loader } from "../../icons/loader";
import { Trash } from "../../icons/trash";
import type { CodeResultType } from "../../types";
import { removeDecoratorNode } from "../../utils/commands";
import { useCodeEditorFocus } from "./hooks";

export function CodeViewer({
	language,
	nodeKey,
	isCodeSettingsOpen,
	setIsCodeSettingsOpen,
	command,
	codeResult,
	setCodeResult,
	writeDataToNode,
	focus,
	isSelected,
	setIsSelected,
}: {
	language: string;
	nodeKey: string;
	isCodeSettingsOpen: boolean;
	setIsCodeSettingsOpen: Dispatch<SetStateAction<boolean>>;
	command: string;
	codeResult: CodeResultType;
	setCodeResult: Dispatch<SetStateAction<CodeResultType>>;
	writeDataToNode: (files: SandpackFiles, result: CodeResultType) => void;
	focus: boolean;
	isSelected: boolean;
	setIsSelected: (arg0: boolean) => void;
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
		RunCode(language, code, command).then((res) => {
			setCodeResult(res);
			setIsCodeRunning(false);
			editor.update(() => {
				writeDataToNode(files, res);
			});
		});
	}

	// If the code settings closes, then refocus onto the editor
	useEffect(() => {
		if (!isCodeSettingsOpen) {
			const codeMirrorInstance =
				// @ts-expect-error For some reason sandpack does not export the EditorView type
				codeMirrorRef.current?.getCodemirror() as EditorView;
			if (codeMirrorInstance) {
				codeMirrorInstance.focus();
			}
		}
	}, [isCodeSettingsOpen]);

	useCodeEditorFocus(codeMirrorRef, focus || isSelected, setIsSelected);

	return (
		<SandpackLayout
			onKeyDown={(e) => {
				setIsSelected(true);
				if (e.key === "Enter" && e.shiftKey) handleRunCode();
				else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
					e.stopPropagation();
				} else if (
					e.metaKey &&
					(e.key === "c" || e.key === "x" || e.key === "a")
				) {
					e.stopPropagation();
				}
			}}
			onKeyUp={() => {
				editor.update(() => {
					writeDataToNode(files, codeResult);
				});
			}}
		>
			{language in languageToTemplate && (
				<SandpackFileExplorer style={{ height: "auto" }} />
			)}
			<SandpackCodeEditor
				ref={codeMirrorRef}
				style={{ height: "auto" }}
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
				]}
			/>

			{language in nonTemplateLanguageToExtension && (
				<motion.button
					className="absolute top-0 right-10 h-10 text-zinc-700 dark:text-zinc-200"
					{...getDefaultButtonVariants()}
					onClick={() => setIsCodeSettingsOpen(true)}
				>
					<BracketsSquareDots />
				</motion.button>
			)}

			<motion.button
				className="absolute top-0 right-2 h-10 text-zinc-700 dark:text-zinc-200"
				{...getDefaultButtonVariants()}
				onClick={() => {
					editor.update(() => {
						removeDecoratorNode(nodeKey);
					});
				}}
			>
				<Trash />
			</motion.button>
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
