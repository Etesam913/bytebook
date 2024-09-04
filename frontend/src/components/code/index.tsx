import {
	type SandpackFiles,
	type SandpackInternalOptions,
	SandpackLayout,
	SandpackPreview,
	SandpackProvider,
} from "@codesandbox/sandpack-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useRef, useState } from "react";
import type { CodeResponse } from "../../../bindings/github.com/etesam913/bytebook";
import { getDefaultButtonVariants } from "../../animations";
import { darkModeAtom } from "../../atoms";
import { Play } from "../../icons/circle-play";
import { Loader } from "../../icons/loader";
import type { CodeBlockData } from "../../types";
import { cn } from "../../utils/string-formatting";
import { Input } from "../input";
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
	rust: "rs",
	cpp: "cpp",
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
	rust: {
		"main.rs": {
			code: `fn main() {
    println!("Hello, world!");
}`,
			active: true,
		},
	},
	cpp: {
		"main.cpp": {
			code: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`,
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
}: {
	data: CodeBlockData;
	language: string;
	nodeKey: string;
	commandWrittenToNode: string;
	writeCommandToNode: (language: string) => void;
	writeDataToNode: (files: SandpackFiles, result: CodeResponse) => void;
}) {
	const isDarkModeOn = useAtomValue(darkModeAtom);
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [editor] = useLexicalComposerContext();
	const [isFullscreen, setIsFullscreen] = useState(false);
	const defaultFiles = useRef(data.files);

	const [codeResult, setCodeResult] = useState<CodeResponse>(data.result);

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

	const isNonTemplateLanguageFullscreen =
		isFullscreen && language in nonTemplateLanguageToExtension;
	const isTemplateLanguageFullscreen =
		isFullscreen && language in languageToTemplate;

	return (
		<div
			ref={codeMirrorContainerRef}
			data-is-fullscreen={isFullscreen}
			data-non-template-is-fullscreen={isNonTemplateLanguageFullscreen}
			data-template-is-fullscreen={isTemplateLanguageFullscreen}
			className={cn(
				"border-transparent transition-colors text-zinc-700 dark:text-zinc-200 border-2 rounded-tl-md rounded-md",
				isSelected && "border-blue-400 dark:border-blue-500",
				isFullscreen &&
					"fixed top-0 left-0 right-0 bottom-0 z-20 h-screen border-0",
			)}
		>
			<SandpackProvider
				theme={isDarkModeOn ? "dark" : "light"}
				files={defaultFiles.current}
				options={getOptions()}
				className="flex flex-col h-full"
				template={
					language in languageToTemplate
						? languageToTemplate[language]
						: "vanilla"
				}
			>
				<CodeViewer
					nodeKey={nodeKey}
					language={language}
					codeResult={codeResult}
					setCodeResult={setCodeResult}
					commandWrittenToNode={commandWrittenToNode}
					writeCommandToNode={writeCommandToNode}
					writeDataToNode={writeDataToNode}
					isSelected={isSelected}
					setIsSelected={setSelected}
					isFullscreen={isFullscreen}
					setIsFullscreen={setIsFullscreen}
				/>

				{language in languageToTemplate ? (
					<SandpackLayout>
						<SandpackPreview showOpenInCodeSandbox={false} />
					</SandpackLayout>
				) : (
					<div>
						<form
							className="p-2 font-code justify-between border-[1px] border-t-0 border-b-0 border-[rgb(229,231,235)] dark:border-[rgb(37,37,37)] bg-white dark:bg-[rgb(21,21,21)]"
							onSubmit={(e) => e.preventDefault()}
						>
							<div className="flex gap-2 justify-start items-center">
								<Input
									label="Run Command:"
									labelProps={{
										className: "text-xs cursor-pointer pb-0",
										htmlFor: "run-command",
									}}
									inputProps={{
										spellCheck: false,
										className:
											"py-1 px-2 rounded-md bg-zinc-50 dark:bg-zinc-800 outline-zinc-200 dark:outline-zinc-750 flex-1 text-zinc-950 dark:text-zinc-100",
										id: "run-command",
									}}
								/>

								<motion.button
									className="border-2 border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 p-[0.25rem] rounded-md"
									{...getDefaultButtonVariants()}
									// onClick={handleRunCode}
									// disabled={isCodeRunning}
									title="Run Code"
								>
									<Play title="Run Code" height="1.1rem" width="1.1rem" />
								</motion.button>
							</div>
						</form>
						<CodeResult codeResult={codeResult} />
					</div>
				)}
			</SandpackProvider>
		</div>
	);
}
