import {
	type SandpackFiles,
	type SandpackInternalOptions,
	SandpackProvider,
} from "@codesandbox/sandpack-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { useAtomValue } from "jotai";
import { useRef, useState } from "react";
import type { CodeResponse } from "../../../bindings/github.com/etesam913/bytebook";
import { isDarkModeOnAtom } from "../../atoms";
import type { CodeBlockData } from "../../types";
import { cn } from "../../utils/string-formatting";
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
	c: "c",
};

export const nonTemplateLanguageDefaultFiles: Record<string, SandpackFiles> = {
	python: {
		"main.py": { code: "print('hello from python!')\n\n\n", active: true },
	},
	go: {
		"main.go": {
			code: `package main\n\nimport "fmt"\n\nfunc main(){\n  fmt.Println("hello from go!")\n}`,
			active: true,
		},
	},
	java: {
		"main.java": {
			code: `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("hello from java!");
    }
}`,
			active: true,
		},
	},
	rust: {
		"main.rs": {
			code: `fn main() {
    println!("hello from rust");
}`,
			active: true,
		},
	},
	cpp: {
		"main.cpp": {
			code: `#include <iostream>\n\nint main() {\n    std::cout << "hello from c++" << std::endl;\n    return 0;\n}`,
			active: true,
		},
	},
	c: {
		"main.c": {
			code: `#include <stdio.h>\n\nint main() {\n    printf("hello from c!\\n");\n    return 0;\n}`,
			active: true,
		},
	},
};

export function CodeBlock({
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
	const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
	const [isSelected, setIsSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [editor] = useLexicalComposerContext();
	const [isFullscreen, setIsFullscreen] = useState(false);
	const defaultFiles = useRef(data.files);

	const codeMirrorContainerRef = useRef<HTMLDivElement>(null);

	useCodeEditorCommands(
		editor,
		isSelected,
		codeMirrorContainerRef,
		setIsSelected,
		clearSelection,
	);

	// TODO: Create folder for the language if it doesn't exist
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
				className={cn("flex flex-col h-[515px]", isFullscreen && "h-screen")}
				template={
					language in languageToTemplate
						? languageToTemplate[language]
						: "vanilla"
				}
			>
				<CodeViewer
					nodeKey={nodeKey}
					language={language}
					commandWrittenToNode={commandWrittenToNode}
					data={data}
					uiState={{
						isFullscreen,
						setIsFullscreen,
						isSelected,
						setIsSelected,
					}}
					writeDataToNode={writeDataToNode}
					writeCommandToNode={writeCommandToNode}
				/>
			</SandpackProvider>
		</div>
	);
}
