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
import { AnimatePresence, motion } from "framer-motion";
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
import { ExitFullscreen } from "../../icons/arrows-reduce-diagonal";
import { Fullscreen } from "../../icons/fullscreen";
import { Loader } from "../../icons/loader";
import { Trash } from "../../icons/trash";
import { removeDecoratorNode } from "../../utils/commands";
import { cn } from "../../utils/string-formatting";
import { CodeResult } from "./code-result";
import { useCodeEditorFocus } from "./hooks";
import { RunCommand } from "./run-command";

export function CodeViewer({
	language,
	defaultResult,
	nodeKey,
	commandWrittenToNode,
	writeDataToNode,
	writeCommandToNode,
	uiState,
}: {
	language: string;
	defaultResult: CodeResponse;
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
	/*
	 Code only has to be run locally if it's a non-template language.
	 Sandpack can handle running template languages by itself.
	*/
	const [isCodeRunning, setIsCodeRunning] = useState(false);
	const [codeResult, setCodeResult] = useState<CodeResponse>(defaultResult);
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
		<>
			<SandpackLayout
				className="flex-1 rounded-bl-none rounded-br-none"
				onKeyDown={(e) => {
					setIsSelected(true);
					if (e.key === "Enter" && e.shiftKey) {
						handleRunCode();
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
			</SandpackLayout>
			{language in languageToTemplate ? (
				<SandpackLayout>
					<SandpackPreview showOpenInCodeSandbox={false} />
				</SandpackLayout>
			) : (
				<div className="relative text-zinc-950 dark:text-zinc-100">
					<AnimatePresence>
						{isCodeRunning && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1, transition: { delay: 0.75 } }}
								exit={{ opacity: 0 }}
								className="absolute bg-gray-50 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-60 w-full h-full z-10 flex gap-2 justify-center items-center"
							>
								<Loader height="1.15rem" width="1.15rem" />
								<button type="button">Cancel</button>
							</motion.div>
						)}
					</AnimatePresence>
					<RunCommand
						commandWrittenToNode={commandWrittenToNode}
						writeCommandToNode={writeCommandToNode}
						nodeKey={nodeKey}
						handleRunCode={handleRunCode}
						isCodeRunning={isCodeRunning}
					/>
					<CodeResult codeResult={codeResult} />
				</div>
			)}
		</>
	);
}
