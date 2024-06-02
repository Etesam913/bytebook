import {
	type SandpackFiles,
	type SandpackInternalOptions,
	SandpackLayout,
	SandpackPreview,
	SandpackProvider,
} from "@codesandbox/sandpack-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { useAtomValue } from "jotai";
import { useRef, useState } from "react";
import type { CodeResponse } from "../../../bindings/github.com/etesam913/bytebook";
import { darkModeAtom } from "../../atoms";
import type { CodeBlockData } from "../../types";
import { cn } from "../../utils/string-formatting";
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
	focus,
}: {
	data: CodeBlockData;
	language: string;
	nodeKey: string;
	commandWrittenToNode: string;
	focus: boolean;
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
				"border-transparent transition-colors text-zinc-700 dark:text-zinc-200 border-2 bg-zinc-50 dark:bg-zinc-750 rounded-md",
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
					focus={focus}
					isSelected={isSelected}
					setIsSelected={setSelected}
					isFullscreen={isFullscreen}
					setIsFullscreen={setIsFullscreen}
				/>

				<div className="mt-1">
					{language in languageToTemplate ? (
						<SandpackLayout>
							<SandpackPreview showNavigator showOpenInCodeSandbox={false} />
						</SandpackLayout>
					) : (
						<CodeResult codeResult={codeResult} />
					)}
				</div>
			</SandpackProvider>
		</div>
	);
}
