import type { SandpackFiles } from "@codesandbox/sandpack-react";
import type {
	EditorConfig,
	LexicalEditor,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type { CodeResponse } from "../../../../bindings/github.com/etesam913/bytebook";
import type { CodeBlockData } from "../../../types";
import { languageToCommandMap } from "../../../utils/code";
import { CodeBlock, nonTemplateLanguageDefaultFiles } from "../../code/index";
import { TerminalComponent } from "../../terminal";

export interface CodePayload {
	key?: NodeKey;
	language: string;
	data?: CodeBlockData;
	command?: string;
	startDirectory?: string;
	shell: string;
}

export type SerializedCodeNode = Spread<
	{
		data?: CodeBlockData;
		language: string;
		command: string;
		startDirectory: string;
		shell: string;
	},
	SerializedLexicalNode
>;

/**
    * A node that represents a code block

    `files`: The files that are present in the code block

    `result`: The result from running the code block

        `id`: The id of the result. A new id is generated on the backend whenever a result is outputted. It is used in the animation of the code block result.

        `success`: Whether the code block ran successfully or not. It is used to make the text color default or red.
*/
export class CodeNode extends DecoratorNode<JSX.Element> {
	__data: CodeBlockData = {
		files: {},
		result: { id: "0", message: "", success: true },
	};
	__language: string;
	__command = "";
	__startDirectory = "";
	__shell = "";

	static getType(): string {
		return "code-block";
	}

	static clone(node: CodeNode): CodeNode {
		return new CodeNode(
			node.__data,
			node.__language,
			node.__command,
			node.__startDirectory,
			node.__shell,
			node.__key,
		);
	}

	static importJSON(serializedNode: SerializedCodeNode): CodeNode {
		const { data, language, command, shell, startDirectory } = serializedNode;
		const node = $createCodeNode({
			data,
			language,
			command,
			shell,
			startDirectory,
		});
		return node;
	}

	isInline(): false {
		return false;
	}

	constructor(
		data: CodeBlockData,
		language: string,
		command: string,
		startDirectory: string,
		shell: string,
		key?: NodeKey,
	) {
		super(key);
		// The actual code and terminal output
		this.__data = data;

		// The language of the code
		this.__language = language;

		// The shell to run the terminal in
		this.__shell = shell;

		// The directory to run the code in
		this.__startDirectory = startDirectory;

		this.__command = command
			? command
			: language in languageToCommandMap
				? languageToCommandMap[language]
				: "";
	}

	exportJSON(): SerializedCodeNode {
		return {
			data: this.getData(),
			language: this.getLanguage(),
			command: this.getCommand(),
			shell: this.getShell(),
			startDirectory: this.getStartDirectory(),
			type: "code-block",
			version: 1,
		};
	}

	// View
	createDOM(config: EditorConfig): HTMLElement {
		const span = document.createElement("span");
		const theme = config.theme;
		const className = theme.image;
		if (className !== undefined) {
			span.className = className;
		}
		return span;
	}

	updateDOM(): false {
		return false;
	}

	getData(): CodeBlockData {
		return this.__data;
	}

	getLanguage(): string {
		return this.__language;
	}

	getCommand(): string {
		return this.__command;
	}

	getShell(): string {
		return this.__shell;
	}

	getStartDirectory(): string {
		return this.__startDirectory;
	}

	setData(
		files: SandpackFiles,
		result: CodeResponse,
		editor: LexicalEditor,
	): void {
		editor.update(
			() => {
				const writable = this.getWritable();
				writable.__data = { files, result };
			},
			{ tag: "note:terminal-change" },
		);
	}

	setTerminalData(result: CodeResponse, editor: LexicalEditor): void {
		editor.update(
			() => {
				const writable = this.getWritable();
				writable.__data = { ...writable.__data, result };
			},
			// This tag tells the editor to not propagate the terminal change to other note windows
			{ tag: "note:terminal-change" },
		);
	}

	setLanguage(language: string, editor: LexicalEditor): void {
		editor.update(() => {
			const writable = this.getWritable();
			writable.__language = language;
		});
	}

	setCommand(command: string, editor: LexicalEditor): void {
		editor.update(() => {
			const writable = this.getWritable();
			writable.__command = command;
		});
	}

	setStartDirectory(startDirectory: string, editor: LexicalEditor): void {
		editor.update(() => {
			const writable = this.getWritable();
			writable.__startDirectory = startDirectory;
		});
	}

	decorate(_editor: LexicalEditor): JSX.Element {
		if (this.getLanguage() === "terminal") {
			return (
				<TerminalComponent
					nodeKey={this.getKey()}
					isInCodeSnippet={false}
					data={this.getData()}
					shell={this.getShell()}
					startDirectory={this.getStartDirectory()}
					writeDataToNode={(result: CodeResponse) =>
						this.setTerminalData(result, _editor)
					}
				/>
			);
		}
		return (
			<CodeBlock
				nodeKey={this.getKey()}
				data={this.getData()}
				language={this.getLanguage()}
				commandWrittenToNode={this.getCommand()}
				writeDataToNode={(files: SandpackFiles, result: CodeResponse) =>
					this.setData(files, result, _editor)
				}
				writeCommandToNode={(command: string) =>
					this.setCommand(command, _editor)
				}
			/>
		);
	}
}

export function $createCodeNode({
	data,
	language,
	command,
	startDirectory,
	shell,
}: CodePayload): CodeNode {
	const defaultFiles: SandpackFiles =
		language in nonTemplateLanguageDefaultFiles
			? nonTemplateLanguageDefaultFiles[language]
			: {};
	return $applyNodeReplacement(
		new CodeNode(
			data ?? {
				files: defaultFiles,
				result: { id: "0", message: "", success: true },
			},
			language,
			command ?? "",
			startDirectory ?? "",
			shell,
		),
	);
}

export function $isCodeNode(
	node: LexicalNode | null | undefined,
): node is CodeNode {
	return node instanceof CodeNode;
}
