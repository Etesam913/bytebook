import {
	SandpackProvider,
	SandpackFiles,
	SandpackLayout,
	SandpackPreview,
	SandpackFileExplorer,
} from "@codesandbox/sandpack-react";

import { useAtomValue } from "jotai";
import { darkModeAtom } from "../../atoms";
import { CodeViewer } from "./code-viewer";
import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CodeDialog } from "./code-dialog";
import { useCodeEditorCommands } from "./hooks";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

type templates = "vanilla" | "angular" | "react" | "vue" | "svelte";

export const languageToTemplate: Record<string, templates> = {
	javascript: "vanilla",
	angular: "angular",
	react: "react",
	vue: "vue",
	svelte: "svelte",
};

export const nonTemplateLanguageToExtension: Record<string, string> = {
	python: "js",
	go: "go",
	java: "java",
};

export const nonTemplateLanguageDefaultFiles: Record<string, SandpackFiles> = {
	python: { "main.py": { code: "print('hello world')\n\n\n", active: true } },
	go: {
		"main.go": {
			code: `package main\n\nimport "fmt"\n\nfunc main(){\n\tfmt.Println("nice")\n}`,
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
	writeLanguageToNode,
	commandWrittenToNode,
	writeCommandToNode,
	onCodeChange,
	focus,
}: {
	code: string;
	languageWrittenToNode: string;
	nodeKey: string;
	commandWrittenToNode: string;
	focus: boolean;
	onCodeChange: (code: string) => void;
	writeCommandToNode: (language: string) => void;
	writeLanguageToNode: (language: string) => void;
}) {
	const isDarkModeOn = useAtomValue(darkModeAtom);
	const [language, setLanguage] = useState(languageWrittenToNode);
	const [isCodeSettingsOpen, setIsCodeSettingsOpen] = useState(false);
	const [command, setCommand] = useState(commandWrittenToNode);
	const [isSelected, setIsSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [editor] = useLexicalComposerContext();

	const codeMirrorContainerRef = useRef<HTMLDivElement>(null);

	useCodeEditorCommands(
		editor,
		nodeKey,
		isSelected,
		setIsSelected,
		clearSelection,
		codeMirrorContainerRef,
	);

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
					files={
						language in nonTemplateLanguageDefaultFiles
							? nonTemplateLanguageDefaultFiles[language]
							: {}
					}
					template={
						language in languageToTemplate
							? languageToTemplate[language]
							: "vanilla"
					}
				>
					<SandpackLayout>
						{language in languageToTemplate && <SandpackFileExplorer />}
						<CodeViewer
							command={command}
							nodeKey={nodeKey}
							language={language}
							setIsCodeSettingsOpen={setIsCodeSettingsOpen}
						/>
					</SandpackLayout>

					{language in languageToTemplate && (
						<SandpackLayout>
							<SandpackPreview showNavigator showOpenInCodeSandbox={true} />
						</SandpackLayout>
					)}
				</SandpackProvider>
			</div>
		</>
	);
}
