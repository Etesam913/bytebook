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
	SandpackPreview,
} from "@codesandbox/sandpack-react";
import { SandpackCodeEditor, useSandpack } from "@codesandbox/sandpack-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { motion } from "framer-motion";
import { type Dispatch, type SetStateAction, useMemo, useRef } from "react";
import { toast } from "sonner";
import { languageToTemplate, nonTemplateLanguageToExtension } from ".";
import type { CodeResponse } from "../../../bindings/github.com/etesam913/bytebook/index";
import { useAtomValue } from "jotai/react";
import { UpdateTempCodeFile } from "../../../bindings/github.com/etesam913/bytebook/nodeservice";
import { RunCodeInTerminal } from "../../../bindings/github.com/etesam913/bytebook/terminalservice";
import { getDefaultButtonVariants } from "../../animations";
import { projectSettingsAtom } from "../../atoms";
import { ExitFullscreen } from "../../icons/arrows-reduce-diagonal";
import { Duplicate2 } from "../../icons/duplicate-2";
import { Fullscreen } from "../../icons/fullscreen";
import { Trash } from "../../icons/trash";
import type { CodeBlockData } from "../../types";
import { removeDecoratorNode } from "../../utils/commands";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/misc";
import { cn } from "../../utils/string-formatting";
import { TerminalComponent } from "../terminal";
import { useCodeEditorFocus } from "./hooks";

export function CodeViewer({
	language,
	data,
	nodeKey,
	commandWrittenToNode,
	writeDataToNode,
	writeCommandToNode,
	uiState,
}: {
	language: string;
	data: CodeBlockData;
	nodeKey: string;
	commandWrittenToNode: string;
	writeDataToNode: (files: SandpackFiles, result: CodeResponse) => void;
	writeCommandToNode: (arg0: string) => void;
	uiState: {
		isFullscreen: boolean;
		setIsFullscreen: Dispatch<SetStateAction<boolean>>;
		isSelected: boolean;
		setIsSelected: (arg0: boolean) => void;
	};
}) {
	const [editor] = useLexicalComposerContext();
	const { sandpack } = useSandpack();
	const { files, activeFile } = sandpack;
	const { isFullscreen, setIsFullscreen, isSelected, setIsSelected } = uiState;
	const code = useMemo(() => files[activeFile].code, [sandpack.files]);
	const codeMirrorRef = useRef<CodeEditorRef | null>(null);
	const { projectPath } = useAtomValue(projectSettingsAtom);

	useCodeEditorFocus(codeMirrorRef, isSelected, setIsSelected);

	return (
		<>
			<SandpackLayout
				onClick={() => {
					const cmInstance = codeMirrorRef.current?.getCodemirror();
					if (cmInstance) {
						cmInstance.focus();
					}
				}}
				className="flex-1 rounded-bl-none rounded-br-none"
				onKeyDown={async (e) => {
					setIsSelected(true);
					if (e.key === "Enter" && e.shiftKey) {
						try {
							const updateTempResponse = await UpdateTempCodeFile(
								nodeKey,
								language,
								code,
								commandWrittenToNode,
							);
							if (!updateTempResponse.success)
								throw new Error(updateTempResponse.message);
							const runCodeResponse = await RunCodeInTerminal(
								nodeKey,
								commandWrittenToNode,
							);
							if (!runCodeResponse.success)
								throw new Error(runCodeResponse.message);
						} catch {
							toast.error(
								"Something went wrong when running your code. Please try again later",
								DEFAULT_SONNER_OPTIONS,
							);
						}
					}
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
						writeDataToNode(files, data.result);
					});
				}}
				onBlur={() =>
					UpdateTempCodeFile(nodeKey, language, code, commandWrittenToNode)
				}
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
						{
							name: "c",
							extensions: [nonTemplateLanguageToExtension.c],
							language: cpp(),
						},
					]}
				/>

				<motion.button
					className={cn(
						"absolute top-0 right-[4.75rem] h-10 text-zinc-700 dark:text-zinc-200",
						isFullscreen && "top-1.5",
					)}
					{...getDefaultButtonVariants()}
					onClick={() => {
						editor.update(() => {
							removeDecoratorNode(nodeKey);
						});
					}}
				>
					<Trash className="will-change-transform" />
				</motion.button>

				<motion.button
					className={cn(
						"absolute top-0 right-10 h-10 text-zinc-700 dark:text-zinc-200",
						isFullscreen && "top-1.5",
					)}
					{...getDefaultButtonVariants()}
					onClick={async () => {
						try {
							navigator.clipboard.writeText(code);
							toast.success("Copied code to clipboard", DEFAULT_SONNER_OPTIONS);
						} catch {
							toast.error(
								"Failed to copy code to clipboard",
								DEFAULT_SONNER_OPTIONS,
							);
						}
					}}
				>
					<Duplicate2 className="will-change-transform" />
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
					{isFullscreen ? (
						<ExitFullscreen className="will-change-transform" />
					) : (
						<Fullscreen className="will-change-transform" />
					)}
				</motion.button>
			</SandpackLayout>
			{language in languageToTemplate ? (
				<SandpackLayout>
					<SandpackPreview showOpenInCodeSandbox={false} />
				</SandpackLayout>
			) : (
				<TerminalComponent
					nodeKey={nodeKey}
					data={data}
					shell="bash"
					isInCodeSnippet
					startDirectory={`${projectPath}/${language}/src`}
					writeDataToNode={(terminalResult) => {
						writeDataToNode(data.files, terminalResult);
					}}
					commandWrittenToNode={commandWrittenToNode}
					writeCommandToNode={writeCommandToNode}
					onClick={() => {
						UpdateTempCodeFile(nodeKey, language, code, commandWrittenToNode);
					}}
				/>
			)}
		</>
	);
}
