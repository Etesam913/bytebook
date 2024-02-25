import type {
	DOMConversionMap,
	DOMConversionOutput,
	DOMExportOutput,
	EditorConfig,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";

import { $applyNodeReplacement, DecoratorNode } from "lexical";
import { Suspense } from "react";
import { Image } from "../../image";

export interface ImagePayload {
	alt: string;
	height?: number;
	key?: NodeKey;
	src: string;
	width?: number;
}

function convertImageElement(domNode: Node): null | DOMConversionOutput {
	const img = domNode as HTMLImageElement;
	if (img.src.startsWith("file:///")) {
		return null;
	}
	const { alt, src, width, height } = img;
	const node = $createImageNode({ alt, height, src, width });
	return { node };
}

export type SerializedImageNode = Spread<
	{
		alt: string;
		height?: number;
		src: string;
		width?: number;
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
		const { alt, height, width, src } = serializedNode;
		const node = $createImageNode({
			alt,
			height,
			src,
			width,
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

	exportJSON(): SerializedImageNode {
		return {
			alt: this.getAltText(),
			height: this.__height === "inherit" ? 0 : this.__height,
			src: this.getSrc(),
			type: "image",
			version: 1,
			width: this.__width === "inherit" ? 0 : this.__width,
		};
	}

	setWidthAndHeight(
		width: "inherit" | number,
		height: "inherit" | number,
	): void {
		const writable = this.getWritable();
		writable.__width = width;
		writable.__height = height;
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

	getSrc(): string {
		return this.__src;
	}

	getAltText(): string {
		return this.__alt;
	}

	decorate(): JSX.Element {
		return (
			<Suspense fallback={null}>
				<Image src={this.__src} width={this.__width} height={this.__height} />
			</Suspense>
		);
	}
}

export function $createImageNode({
	alt,
	height,
	src,
	width,
	key,
}: ImagePayload): ImageNode {
	return $applyNodeReplacement(new ImageNode(src, alt, width, height, key));
}

export function $isImageNode(
	node: LexicalNode | null | undefined,
): node is ImageNode {
	return node instanceof ImageNode;
}
