import type {
	DOMConversionMap,
	DOMConversionOutput,
	DOMExportOutput,
	LexicalEditor,
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
import type { ResizeWidth } from "../../../types";
import { Image } from "../../image";

export interface ImagePayload {
	alt: string;
	width?: ResizeWidth;
	key?: NodeKey;
	src: string;
}

function convertImageElement(domNode: Node): null | DOMConversionOutput {
	const img = domNode as HTMLImageElement;

	if (img.src.startsWith("file:///")) {
		return null;
	}
	const { alt, src, width } = img;
	const node = $createImageNode({ alt, src, width });
	const parentNode = $createParagraphNode();
	parentNode.append(node);
	return { node: node };
}

export type SerializedImageNode = Spread<
	{
		alt: string;
		width?: ResizeWidth;
		src: string;
	},
	SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
	__src: string;
	__alt: string;
	__width: ResizeWidth;

	static getType(): string {
		return "image";
	}

	static clone(node: ImageNode): ImageNode {
		return new ImageNode(node.__src, node.__alt, node.__width, node.__key);
	}

	static importJSON(serializedNode: SerializedImageNode): ImageNode {
		const { alt, width, src } = serializedNode;
		const node = $createImageNode({
			alt,
			width,
			src,
		});
		return node;
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement("img");
		element.setAttribute("src", this.__src);
		element.setAttribute("alt", this.__alt);
		element.setAttribute("width", this.__width.toString());

		return { element };
	}

	static importDOM(): DOMConversionMap | null {
		return {
			img: () => ({
				conversion: convertImageElement,
				priority: 0,
			}),
		};
	}

	constructor(src: string, alt: string, width?: ResizeWidth, key?: NodeKey) {
		super(key);
		this.__src = src;
		this.__alt = alt;
		this.__width = width ?? "100%";
	}

	exportJSON(): SerializedImageNode {
		return {
			alt: this.getAltText(),
			width: this.getWidth(),
			src: this.getSrc(),
			type: this.getType(),
			version: 1,
		};
	}

	isInline() {
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

	getAltText(): string {
		return this.__alt;
	}

	getWidth(): ResizeWidth {
		return this.__width;
	}

	setWidth(width: ResizeWidth, editor: LexicalEditor): void {
		editor.update(() => {
			const writable = this.getWritable();
			writable.__width = width;
		});
	}

	decorate(_editor: LexicalEditor): JSX.Element {
		return (
			<Image
				src={this.getSrc()}
				alt={this.getAltText()}
				widthWrittenToNode={this.getWidth()}
				writeWidthToNode={(width) => this.setWidth(width, _editor)}
				nodeKey={this.getKey()}
			/>
		);
	}
}

export function $createImageNode({
	alt,
	src,
	width,
	key,
}: ImagePayload): ImageNode {
	return $applyNodeReplacement(new ImageNode(src, alt, width, key));
}

export function $isImageNode(
	node: LexicalNode | null | undefined,
): node is ImageNode {
	return node instanceof ImageNode;
}
