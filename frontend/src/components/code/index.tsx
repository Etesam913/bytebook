import {
	type SandpackFiles,
	type SandpackInternalOptions,
	SandpackLayout,
	SandpackPreview,
	SandpackProvider,
} from "@codesandbox/sandpack-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useRef, useState } from "react";
import { darkModeAtom } from "../../atoms";
import type { CodeBlockData, CodeResultType } from "../../types";
import { cn } from "../../utils/string-formatting";
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
	language,
	nodeKey,
	data,
	commandWrittenToNode,
	writeCommandToNode,
	writeDataToNode,
	focus,
}: {
	data: CodeBlockData;
	language: string;
	nodeKey: string;
	commandWrittenToNode: string;
	focus: boolean;
	writeCommandToNode: (language: string) => void;
	writeDataToNode: (files: SandpackFiles, result: CodeResultType) => void;
}) {
	const isDarkModeOn = useAtomValue(darkModeAtom);
	const [isCodeSettingsOpen, setIsCodeSettingsOpen] = useState(false);
	const [command, setCommand] = useState(commandWrittenToNode);
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [editor] = useLexicalComposerContext();

	const defaultFiles = useRef(data.files);

	const [codeResult, setCodeResult] = useState<CodeResultType>(data.result);

	const codeMirrorContainerRef = useRef<HTMLDivElement>(null);

	useCodeEditorCommands(
		editor,
		isSelected,
		codeMirrorContainerRef,
		setSelected,
		clearSelection,
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
			<motion.div
				layout
				ref={codeMirrorContainerRef}
				className={cn(
					"border-transparent transition-colors text-zinc-700 dark:text-zinc-200 border-2",
					isSelected && "border-blue-400 dark:border-blue-500",
				)}
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
					<motion.div layout="position">
						<CodeViewer
							command={command}
							nodeKey={nodeKey}
							language={language}
							isCodeSettingsOpen={isCodeSettingsOpen}
							setIsCodeSettingsOpen={setIsCodeSettingsOpen}
							codeResult={codeResult}
							setCodeResult={setCodeResult}
							writeDataToNode={writeDataToNode}
							focus={focus}
							isSelected={isSelected}
						/>
					</motion.div>
					<motion.div layout className="mt-1">
						{language in languageToTemplate ? (
							<SandpackLayout>
								<SandpackPreview showNavigator showOpenInCodeSandbox={false} />
							</SandpackLayout>
						) : (
							<CodeResult codeResult={codeResult} />
						)}
					</motion.div>
				</SandpackProvider>
			</motion.div>
		</>
	);
}
