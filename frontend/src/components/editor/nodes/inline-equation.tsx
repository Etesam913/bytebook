import type {
	LexicalEditor,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type { JSX } from "react";
import { InlineEquation } from "../../inline-equation";

export interface InlineEquationPayload {
	key?: NodeKey;
	equation: string;
	defaultIsEditing?: boolean;
}

export type SerializedInlineEquationNode = Spread<
	{
		equation: string;
		defaultIsEditing: boolean;
	},
	SerializedLexicalNode
>;

export class InlineEquationNode extends DecoratorNode<JSX.Element> {
	__equation = "";
	__defaultIsEditing = false;
	static getType(): string {
		return "inline-equation";
	}

	static clone(node: InlineEquationNode): InlineEquationNode {
		return new InlineEquationNode(
			node.__equation,
			node.__defaultIsEditing,
			node.getKey(),
		);
	}

	static importJSON(
		serializedNode: SerializedInlineEquationNode,
	): InlineEquationNode {
		const { equation, defaultIsEditing } = serializedNode;
		const node = $createInlineEquationNode({
			equation,
			defaultIsEditing,
		});
		return node;
	}

	constructor(equation: string, defaultIsEditing: boolean, key?: NodeKey) {
		super(key);
		this.__equation = equation;
		this.__defaultIsEditing = defaultIsEditing;
	}

	exportJSON(): SerializedInlineEquationNode {
		return {
			equation: this.getEquation(),
			defaultIsEditing: this.getDefaultIsEditing(),
			type: "inline-equation",
			version: 1,
		};
	}

	// View
	createDOM(): HTMLElement {
		const span = document.createElement("span");
		return span;
	}

	updateDOM(): false {
		return false;
	}

	getEquation(): string {
		return this.__equation;
	}

	getDefaultIsEditing(): boolean {
		return this.__defaultIsEditing;
	}

	setEquation(equation: string, editor: LexicalEditor): void {
		editor.update(() => {
			const writable = this.getWritable();
			writable.__equation = equation;
		});
	}

	decorate(_editor: LexicalEditor): JSX.Element {
		return (
			<InlineEquation
				writeEquationToNode={(equation: string) =>
					this.setEquation(equation, _editor)
				}
				defaultIsEditing={this.getDefaultIsEditing()}
				nodeKey={this.getKey()}
				equationFromNode={this.getEquation()}
			/>
		);
	}
}

export function $createInlineEquationNode({
	equation,
	defaultIsEditing,
}: InlineEquationPayload): InlineEquationNode {
	return $applyNodeReplacement(
		new InlineEquationNode(equation, defaultIsEditing ?? false),
	);
}

export function $isInlineEquationNode(
	node: LexicalNode | null | undefined,
): node is InlineEquationNode {
	return node instanceof InlineEquationNode;
}
