import type {
	LexicalEditor,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";

export interface InlineEquationPayload {
	key?: NodeKey;
	equation: string;
}

export type SerializedInlineEquationNode = Spread<
	{
		equation: string;
	},
	SerializedLexicalNode
>;

export class InlineEquationNode extends DecoratorNode<JSX.Element> {
	__equation = "";

	static getType(): string {
		return "inline-equation";
	}

	static clone(node: InlineEquationNode): InlineEquationNode {
		return new InlineEquationNode(node.__equation, node.getKey());
	}

	static importJSON(
		serializedNode: SerializedInlineEquationNode,
	): InlineEquationNode {
		const { equation } = serializedNode;
		const node = $createInlineEquationNode({
			equation,
		});
		return node;
	}

	isInline(): boolean {
		return true;
	}

	constructor(equation: string, key?: NodeKey) {
		super(key);
		this.__equation = equation;
	}

	exportJSON(): SerializedInlineEquationNode {
		return {
			equation: this.getEquation(),
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
	// setElements(
	// 	elements: NonDeletedExcalidrawElement[],
	// 	editor: LexicalEditor,
	// ): void {
	// 	editor.update(() => {
	// 		const writable = this.getWritable();
	// 		writable.__elements = elements;
	// 	});
	// }

	decorate(_editor: LexicalEditor): JSX.Element {
		return <span>inline equation</span>;
	}
}

export function $createInlineEquationNode({
	equation,
}: InlineEquationPayload): InlineEquationNode {
	return $applyNodeReplacement(new InlineEquationNode(equation));
}

export function $isInlineEquationNode(
	node: LexicalNode | null | undefined,
): node is InlineEquationNode {
	return node instanceof InlineEquationNode;
}
