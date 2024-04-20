import {
	type SandpackFiles,
	SandpackLayout,
	SandpackPreview,
	SandpackProvider,
	SandpackInternalOptions,
} from "@codesandbox/sandpack-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useRef, useState } from "react";
import { darkModeAtom } from "../../atoms";
import { CodeDialog } from "./code-dialog";
import { CodeResult } from "./code-result";
import { CodeViewer } from "./code-viewer";
import { useCodeEditorCommands } from "./hooks";

type templates = "vanilla" | "angular" | "react" | "vue" | "svelte";

export const languageToTemplate: Record<string, templates> = {
	javascript: "vanilla",
	angular: "angular",
	react: "react",
	vue: "vue",
	svelte: "svelte",
};

export const nonTemplateLanguageToExtension: Record<string, string> = {
	python: "py",
	go: "go",
	java: "java",
};

export const nonTemplateLanguageDefaultFiles: Record<string, SandpackFiles> = {
	python: { "main.py": { code: "print('hello world')\n\n\n", active: true } },
	go: {
		"main.go": {
			code: `package main\n\nimport "fmt"\n\nfunc main(){\n  fmt.Println("nice")\n}`,
			active: true,
		},
	},
	java: {
		"main.java": {
			code: `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
			active: true,
		},
	},
};

export function SandpackEditor({
	languageWrittenToNode,
	nodeKey,
	files,
	commandWrittenToNode,
	writeCommandToNode,
	writeFilesToNode,
	focus,
}: {
	files: SandpackFiles;
	languageWrittenToNode: string;
	nodeKey: string;
	commandWrittenToNode: string;
	focus: boolean;
	writeCommandToNode: (language: string) => void;
	writeFilesToNode: (files: SandpackFiles) => void;
}) {
	const isDarkModeOn = useAtomValue(darkModeAtom);
	const [language, setLanguage] = useState(languageWrittenToNode);
	const [isCodeSettingsOpen, setIsCodeSettingsOpen] = useState(false);
	const [command, setCommand] = useState(commandWrittenToNode);
	const [isSelected, setIsSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [editor] = useLexicalComposerContext();

	const defaultFiles = useRef(files);
	const [codeResult, setCodeResult] = useState<{
		message: string;
		success: boolean;
	}>();

	const codeMirrorContainerRef = useRef<HTMLDivElement>(null);

	useCodeEditorCommands(
		editor,
		nodeKey,
		isSelected,
		setIsSelected,
		clearSelection,
		codeMirrorContainerRef,
	);

	function getOptions(): SandpackInternalOptions {
		if (language in nonTemplateLanguageDefaultFiles) {
			return {
				visibleFiles: [`/main.${nonTemplateLanguageToExtension[language]}`],
				activeFile: `/main.${nonTemplateLanguageToExtension[language]}`,
			};
		}
		return {};
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
				className="text-zinc-700 dark:text-zinc-200"
			>
				<SandpackProvider
					theme={isDarkModeOn ? "dark" : "light"}
					files={defaultFiles.current}
					options={getOptions()}
					template={
						language in languageToTemplate
							? languageToTemplate[language]
							: "vanilla"
					}
				>
					<CodeViewer
						command={command}
						nodeKey={nodeKey}
						language={language}
						setIsCodeSettingsOpen={setIsCodeSettingsOpen}
						setCodeResult={setCodeResult}
						writeFilesToNode={writeFilesToNode}
					/>
					<motion.div layout>
						{language in languageToTemplate ? (
							<SandpackLayout>
								<SandpackPreview showNavigator showOpenInCodeSandbox={false} />
							</SandpackLayout>
						) : (
							<CodeResult codeResult={codeResult} />
						)}
					</motion.div>
				</SandpackProvider>
			</div>
		</>
	);
}
