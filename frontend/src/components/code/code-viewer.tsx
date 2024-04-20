import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";

import {
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
	useMemo,
	useState,
} from "react";
import { languageToTemplate, nonTemplateLanguageToExtension } from ".";
import { RunCode } from "../../../bindings/main/NodeService";
import { Play } from "../../icons/circle-play";
import { Trash } from "../../icons/trash";
import { removeDecoratorNode } from "../../utils/commands";
import { getDefaultButtonVariants } from "../../variants";
import { Loader } from "../../icons/loader";
import { BracketsSquareDots } from "../../icons/brackets-square-dots";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";

export function CodeViewer({
	language,
	nodeKey,
	setIsCodeSettingsOpen,
	command,
	setCodeResult,
	writeFilesToNode,
}: {
	language: string;
	nodeKey: string;
	setIsCodeSettingsOpen: Dispatch<SetStateAction<boolean>>;
	command: string;
	setCodeResult: Dispatch<
		SetStateAction<{ message: string; success: string } | undefined>
	>;
	writeFilesToNode: (files: SandpackFiles) => void;
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

	function handleRunCode(e?: SyntheticEvent) {
		if (e) {
			e.stopPropagation();
		}
		if (isCodeRunning) return;
		setIsCodeRunning(true);
		RunCode(language, code, command).then((res) => {
			setCodeResult(res);
			setIsCodeRunning(false);
		});
	}
	return (
		<SandpackLayout
			onKeyDown={(e) => {
				if (e.key === "Enter" && e.shiftKey) handleRunCode();
			}}
			onKeyUp={() => {
				editor.update(() => {
					writeFilesToNode(files);
				});
			}}
		>
			{language in languageToTemplate && (
				<SandpackFileExplorer style={{ height: "auto" }} />
			)}
			<SandpackCodeEditor
				style={{ height: "auto" }}
				showTabs
				showLineNumbers={false}
				showInlineErrors
				closableTabs
				extensions={[autocompletion()]}
				key={activeFile}
				//@ts-expect-error there is a readonly error, but that is not important
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
					className="absolute bottom-2 right-2 bg-opacity-85 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 p-1.5 rounded-md"
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
