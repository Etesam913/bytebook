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
import type { CodeBlockData, CodeResultType } from "../../../types";
import { languageToCommandMap } from "../../../utils/code";
import {
	SandpackEditor,
	nonTemplateLanguageDefaultFiles,
} from "../../code/index";

export interface CodePayload {
	key?: NodeKey;
	language: string;
	data?: CodeBlockData;
	command?: string;
	focus: boolean;
}

export type SerializedCodeNode = Spread<
	{
		data?: CodeBlockData;
		language: string;
		focus: boolean;
		command: string;
	},
	SerializedLexicalNode
>;

export class CodeNode extends DecoratorNode<JSX.Element> {
	__data: CodeBlockData = { files: {}, result: { message: "", success: true } };
	__language: string;
	__focus = false;
	__command = "";
	static getType(): string {
		return "code-block";
	}

	static clone(node: CodeNode): CodeNode {
		return new CodeNode(node.__data, node.__language, false, node.__command);
	}

	static importJSON(serializedNode: SerializedCodeNode): CodeNode {
		const { data, language, focus, command } = serializedNode;
		const node = $createCodeNode({
			data,
			language,
			focus,
			command,
		});
		return node;
	}

	isInline(): false {
		return false;
	}

	constructor(
		data: CodeBlockData,
		language: string,
		focus: boolean,
		command: undefined | string,
		key?: NodeKey,
	) {
		super(key);
		// The actual code to run
		this.__data = data;

		// The language of the code
		this.__language = language;

		// Used to focus the code block when it is created using markdown
		this.__focus = focus;

		this.__command = command
			? command
			: language in languageToCommandMap
				? languageToCommandMap[language]
				: "node";
	}

	exportJSON(): SerializedCodeNode {
		return {
			data: this.getData(),
			language: this.getLanguage(),
			command: this.getCommand(),
			focus: false,
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

	setData(files: SandpackFiles, result: CodeResultType): void {
		const writable = this.getWritable();
		writable.__data = { files, result };
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

	setFocus(focus: boolean, editor: LexicalEditor): void {
		editor.update(() => {
			const writable = this.getWritable();
			writable.__focus = focus;
		});
	}

	decorate(_editor: LexicalEditor): JSX.Element {
		return (
			<SandpackEditor
				nodeKey={this.getKey()}
				data={this.getData()}
				language={this.getLanguage()}
				commandWrittenToNode={this.getCommand()}
				focus={this.__focus}
				writeDataToNode={(files: SandpackFiles, result: CodeResultType) =>
					this.setData(files, result)
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
	focus,
	command,
}: CodePayload): CodeNode {
	const defaultFiles: SandpackFiles =
		language in nonTemplateLanguageDefaultFiles
			? nonTemplateLanguageDefaultFiles[language]
			: {};
	return $applyNodeReplacement(
		new CodeNode(
			data ?? { files: defaultFiles, result: { message: "", success: true } },
			language,
			focus,
			command,
		),
	);
}

export function $isCodeNode(
	node: LexicalNode | null | undefined,
): node is CodeNode {
	return node instanceof CodeNode;
}
