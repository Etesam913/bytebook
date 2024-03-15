import type {
	DOMConversionMap,
	DOMConversionOutput,
	DOMExportOutput,
	EditorConfig,
	LexicalEditor,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import { Image } from "../../image";

export interface ImagePayload {
	alt: string;
	width?: number;
	height?: number;
	key?: NodeKey;
	src: string;
}

function convertImageElement(domNode: Node): null | DOMConversionOutput {
	const img = domNode as HTMLImageElement;
	if (img.src.startsWith("file:///")) {
		return null;
	}
	const { alt, src, width, height } = img;
	const node = $createImageNode({ alt, src, width, height });
	return { node };
}

export type SerializedImageNode = Spread<
	{
		alt: string;
		width?: number;
		height?: number;
		src: string;
	},
	SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
	__src: string;
	__alt: string;
	__width: "inherit" | number;
	__height: "inherit" | number;

	static getType(): string {
		return "image";
	}

	static clone(node: ImageNode): ImageNode {
		return new ImageNode(
			node.__src,
			node.__alt,
			node.__width,
			node.__height,
			node.__key,
		);
	}

	static importJSON(serializedNode: SerializedImageNode): ImageNode {
		const { alt, width, height, src } = serializedNode;
		const node = $createImageNode({
			alt,
			width,
			height,
			src,
		});
		return node;
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement("img");
		element.setAttribute("src", this.__src);
		element.setAttribute("alt", this.__alt);
		element.setAttribute("width", this.__width.toString());
		element.setAttribute("height", this.__height.toString());
		return { element };
	}

	static importDOM(): DOMConversionMap | null {
		return {
			img: (node: Node) => ({
				conversion: convertImageElement,
				priority: 0,
			}),
		};
	}

	constructor(
		src: string,
		alt: string,
		width?: "inherit" | number,
		height?: "inherit" | number,
		key?: NodeKey,
	) {
		super(key);
		this.__src = src;
		this.__alt = alt;
		this.__width = width || "inherit";
		this.__height = height || "inherit";
	}
	isInline(): false {
		return false;
	}

	exportJSON(): SerializedImageNode {
		return {
			alt: this.getAltText(),
			width: this.__width === "inherit" ? 0 : this.__width,
			height: this.__height === "inherit" ? 0 : this.__height,
			src: this.getSrc(),
			type: this.getType(),
			version: 1,
		};
	}

	// View
	createDOM(config: EditorConfig): HTMLElement {
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

	decorate(_editor: LexicalEditor): JSX.Element {
		return (
			<Image
				src={this.__src}
				width={this.__width}
				height={this.__height}
				nodeKey={this.__key}
			/>
		);
	}
}

export function $createImageNode({
	alt,
	src,
	width,
	height,
	key,
}: ImagePayload): ImageNode {
	return $applyNodeReplacement(new ImageNode(src, alt, width, height, key));
}

export function $isImageNode(
	node: LexicalNode | null | undefined,
): node is ImageNode {
	return node instanceof ImageNode;
}
