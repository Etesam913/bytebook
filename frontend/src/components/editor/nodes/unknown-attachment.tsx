import type {
	DOMConversionMap,
	DOMConversionOutput,
	DOMExportOutput,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";
import {
	$applyNodeReplacement,
	$createParagraphNode,
	DecoratorNode,
} from "lexical";
import { UnknownAttachment } from "../../unknown-attachment";

export interface UnknownAttachmentPayload {
	key?: NodeKey;
	src: string;
}

function convertUnknownAttachmentElement(
	domNode: Node,
): null | DOMConversionOutput {
	const elem = domNode as HTMLImageElement;

	console.log("deez");

	const { src } = elem;
	const node = $createUnknownAttachmentNode({ src });
	const parentNode = $createParagraphNode();
	parentNode.append(node);
	return { node: node };
}

export type SerializedUnknownAttachmentNode = Spread<
	{
		src: string;
	},
	SerializedLexicalNode
>;

export class UnknownAttachmentNode extends DecoratorNode<JSX.Element> {
	__src: string;

	static getType(): string {
		return "unknown-attachment";
	}

	static clone(node: UnknownAttachmentNode): UnknownAttachmentNode {
		return new UnknownAttachmentNode(node.__src, node.__key);
	}

	static importJSON(
		serializedNode: SerializedUnknownAttachmentNode,
	): UnknownAttachmentNode {
		const { src } = serializedNode;
		const node = $createUnknownAttachmentNode({
			src,
		});
		return node;
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement("img");
		element.setAttribute("src", this.__src);

		return { element };
	}

	static importDOM(): DOMConversionMap | null {
		return {
			img: () => ({
				conversion: convertUnknownAttachmentElement,
				priority: 0,
			}),
		};
	}
	constructor(src: string, key?: NodeKey) {
		super(key);
		this.__src = src;
	}

	exportJSON(): SerializedUnknownAttachmentNode {
		return {
			src: this.getSrc(),
			type: this.getType(),
			version: 1,
		};
	}

	isInline(): boolean {
		return true;
	}

	// View
	createDOM(): HTMLElement {
		const span = document.createElement("span");
		return span;
	}

	updateDOM(): false {
		return false;
	}

	getSrc(): string {
		return this.__src;
	}

	decorate(): JSX.Element {
		return <UnknownAttachment nodeKey={this.getKey()} src={this.getSrc()} />;
	}
}

export function $createUnknownAttachmentNode({
	src,
	key,
}: UnknownAttachmentPayload): UnknownAttachmentNode {
	return $applyNodeReplacement(new UnknownAttachmentNode(src, key));
}

export function $isUnknownAttachmentNode(
	node: LexicalNode | null | undefined,
): node is UnknownAttachmentNode {
	return node instanceof UnknownAttachmentNode;
}
