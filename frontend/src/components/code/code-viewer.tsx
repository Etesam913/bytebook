import { python } from "@codemirror/lang-python";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { SandpackCodeEditor, useSandpack } from "@codesandbox/sandpack-react";
import { nonTemplateLanguageToExtension } from "./sandpack-editor";
import { getDefaultButtonVariants } from "../../variants";
import { Trash } from "../../icons/trash";
import { motion } from "framer-motion";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { removeDecoratorNode } from "../../utils/commands";
import { Play } from "../../icons/circle-play";
import {
	Dispatch,
	SetStateAction,
	SyntheticEvent,
	useMemo,
	useState,
} from "react";
import { RunCode } from "../../../bindings/main/NodeService";

import { Loader } from "../../icons/loader";

import { BracketsSquareDots } from "../../icons/brackets-square-dots";

export function CodeViewer({
	language,
	nodeKey,
	setIsCodeSettingsOpen,
	command,
}: {
	language: string;
	nodeKey: string;
	setIsCodeSettingsOpen: Dispatch<SetStateAction<boolean>>;
	command: string;
}) {
	const [editor] = useLexicalComposerContext();
	const { sandpack } = useSandpack();
	const { files, activeFile } = sandpack;

	/*
	 Code only has to be run locally if it's a non-template language.
	 Sandpack can handle running template languages by itself.
	*/
	const [isCodeRunning, setIsCodeRunning] = useState(false);
	const [codeResult, setCodeResult] = useState<{
		message: string;
		success: boolean;
	}>();

	const code = useMemo(() => files[activeFile].code, [sandpack.files]);

	function handleRunCode(e?: SyntheticEvent) {
		if (e) {
			e.stopPropagation();
		}

		setIsCodeRunning(true);
		RunCode(language, code, command).then((res) => {
			setCodeResult(res);
			setIsCodeRunning(false);
		});
	}

	return (
		<>
			<SandpackCodeEditor
				showTabs
				showLineNumbers={false}
				showInlineErrors
				wrapContent
				closableTabs
				additionalLanguages={[
					{
						name: "python",
						extensions: [nonTemplateLanguageToExtension["python"]],
						language: python(),
					},
					{
						name: "java",
						extensions: [nonTemplateLanguageToExtension["java"]],
						language: java(),
					},
					{
						name: "go",
						extensions: [nonTemplateLanguageToExtension["go"]],
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
					className="absolute bottom-2 right-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 p-1.5 rounded-md"
					{...getDefaultButtonVariants()}
					onClick={handleRunCode}
				>
					{isCodeRunning ? <Loader /> : <Play />}
				</motion.button>
			)}
		</>
	);
}
