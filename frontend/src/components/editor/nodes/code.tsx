import type {
	EditorConfig,
	LexicalEditor,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";
import { $applyNodeReplacement, $getNodeByKey, DecoratorNode } from "lexical";
import { languageToCommandMap } from "../../../utils/code";
import { Code } from "../../code";

export interface CodePayload {
	key?: NodeKey;
	language: string;
	code: string;
	command?: string;
	focus: boolean;
}

export type SerializedCodeNode = Spread<
	{
		code: string;
		language: string;
		focus: boolean;
		command: string;
	},
	SerializedLexicalNode
>;

export class CodeNode extends DecoratorNode<JSX.Element> {
	__code: string;
	__language: string;
	__focus = false;
	__command = "";
	static getType(): string {
		return "code-block";
	}

	static clone(node: CodeNode): CodeNode {
		return new CodeNode(node.__code, node.__language, false);
	}

	static importJSON(serializedNode: SerializedCodeNode): CodeNode {
		const { code, language, focus, command } = serializedNode;
		const node = $createCodeNode({
			code,
			language,
			focus,
			command,
		});
		return node;
	}

	isInline(): false {
		return false;
	}

	constructor(code: string, language: string, focus: boolean, key?: NodeKey) {
		super(key);
		// The actual code to run
		this.__code = code;

		// The language of the code
		this.__language = language;

		// Used to focus the code block when it is created using markdown
		this.__focus = focus;

		this.__command =
			language in languageToCommandMap
				? languageToCommandMap[language]
				: "node";
	}

	exportJSON(): SerializedCodeNode {
		return {
			code: this.getCode(),
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

	getCode(): string {
		return this.__code;
	}

	getLanguage(): string {
		return this.__language;
	}

	getCommand(): string {
		return this.__command;
	}

	setCode(code: string): void {
		const writable = this.getWritable();
		writable.__code = code;
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

	onCodeChange(code: string, editor: LexicalEditor): void {
		editor.update(() => {
			const node = $getNodeByKey(this.getKey());
			if (node && $isCodeNode(node)) {
				this.setCode(code);
			}
		});
	}

	decorate(_editor: LexicalEditor): JSX.Element {
		return (
			<Code
				nodeKey={this.getKey()}
				code={this.getCode()}
				languageWrittenToNode={this.getLanguage()}
				commandWrittenToNode={this.getCommand()}
				onCodeChange={(code: string) => this.onCodeChange(code, _editor)}
				focus={this.__focus}
				writeLanguageToNode={(language: string) =>
					this.setLanguage(language, _editor)
				}
				writeCommandToNode={(command: string) =>
					this.setCommand(command, _editor)
				}
			/>
		);
	}
}

export function $createCodeNode({
	code,
	language,
	focus,
}: CodePayload): CodeNode {
	return $applyNodeReplacement(new CodeNode(code, language, focus));
}

export function $isCodeNode(
	node: LexicalNode | null | undefined,
): node is CodeNode {
	return node instanceof CodeNode;
}
