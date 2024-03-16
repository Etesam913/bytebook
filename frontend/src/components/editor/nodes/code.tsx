import type {
	EditorConfig,
	LexicalEditor,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";
import { $applyNodeReplacement, $getNodeByKey, DecoratorNode } from "lexical";
import { Suspense } from "react";
import { Code } from "../../code";

export interface CodePayload {
	key?: NodeKey;
	language: string;
	code: string;
	focus: boolean;
}

export type SerializedCodeNode = Spread<
	{
		code: string;
		language: string;
		focus: boolean;
	},
	SerializedLexicalNode
>;

export class CodeNode extends DecoratorNode<JSX.Element> {
	__code: string;
	__language: string;
	__focus = false;

	static getType(): string {
		return "code-block";
	}

	static clone(node: CodeNode): CodeNode {
		return new CodeNode(node.__code, node.__language, false);
	}

	static importJSON(serializedNode: SerializedCodeNode): CodeNode {
		const { code, language, focus } = serializedNode;
		const node = $createCodeNode({
			code,
			language,
			focus,
		});
		return node;
	}

	constructor(code: string, language: string, focus: boolean, key?: NodeKey) {
		super(key);
		this.__code = code;
		this.__language = language;
		this.__focus = focus;
	}

	exportJSON(): SerializedCodeNode {
		return {
			code: this.getCode(),
			language: this.getLanguage(),
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

	setCode(code: string): void {
		const writable = this.getWritable();
		writable.__code = code;
	}

	setLanguage(language: string): void {
		const writable = this.getWritable();
		writable.__language = language;
	}

	goToPreviousElement(
		_editor: LexicalEditor,
		foundPrevNodeCallback: () => void,
	): void {
		_editor.update(() => {
			const node = $getNodeByKey(this.getKey());
			if (node && $isCodeNode(node)) {
				const prevNode = node.getPreviousSibling();
				if (prevNode) {
					prevNode.selectStart();
					foundPrevNodeCallback();
				}
			}
		});
	}

	goToNextElement(
		_editor: LexicalEditor,
		foundNextNodeCallback: () => void,
	): void {
		_editor.update(() => {
			const node = $getNodeByKey(this.getKey());
			if (node && $isCodeNode(node)) {
				const nextNode = node.getNextSibling();
				if (nextNode) {
					nextNode.selectStart();
					foundNextNodeCallback();
				}
			}
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
				language={this.getLanguage()}
				onCodeChange={(code: string) => this.onCodeChange(code, _editor)}
				focus={this.__focus}
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
