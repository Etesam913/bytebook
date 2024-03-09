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

import {
	$applyNodeReplacement,
	$getEditor,
	$getNodeByKey,
	DecoratorNode,
} from "lexical";
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
		console.log("clone image node");
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
		console.log("export image");
		const element = document.createElement("img");
		element.setAttribute("src", this.__src);
		element.setAttribute("alt", this.__alt);
		element.setAttribute("width", this.__width.toString());
		element.setAttribute("height", this.__height.toString());
		return { element };
	}

	static importDOM(): DOMConversionMap | null {
		console.log("import image");
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
			type: "image",
			version: 1,
		};
	}

	// View
	createDOM(config: EditorConfig): HTMLElement {
		console.log("created");
		const span = document.createElement("span");
		// const theme = config.theme;
		// const className = theme.image;
		// if (className !== undefined) {
		// 	span.className = className;
		// }
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

	goToNextElement(_editor: LexicalEditor): void {
		_editor.update(() => {
			const node = $getNodeByKey(this.getKey());
			if (node && $isImageNode(node)) {
				const nextNode = node.getNextSibling();
				if (nextNode) {
					nextNode.selectEnd();
				}
			}
		});
	}

	// replace<N extends LexicalNode>(replaceWith: N, includeChildren?: boolean): N {
	// 	console.log("replace image node", replaceWith);
	// 	return super.replace(replaceWith, includeChildren);
	// }

	decorate(_editor: LexicalEditor): JSX.Element {
		return (
			<Image
				src={this.__src}
				width={this.__width}
				height={this.__height}
				nodeKey={this.__key}
				goToNextElement={() => this.goToNextElement(_editor)}
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
	console.log("create image node");
	return $applyNodeReplacement(new ImageNode(src, alt, width, height, key));
}

export function $isImageNode(
	node: LexicalNode | null | undefined,
): node is ImageNode {
	return node instanceof ImageNode;
}

function $testNodeReplacement<N extends LexicalNode>(node: LexicalNode): N {
	const editor = $getEditor();
	const nodeType = node.constructor.getType();
	const registeredNode = editor._nodes.get(nodeType);
	if (registeredNode === undefined) {
		// invariant(
		//   false,
		//   '$initializeNode failed. Ensure node has been registered to the editor. You can do this by passing the node class via the "nodes" array in the editor config.',
		// );
		console.log("bad");
		return;
	}

	const replaceFunc = registeredNode.replace;
	console.log(registeredNode);

	if (replaceFunc !== null) {
		const replacementNode = replaceFunc(node) as N;
		if (!(replacementNode instanceof node.constructor)) {
			// invariant(
			//   false,
			//   '$initializeNode failed. Ensure replacement node is a subclass of the original node.',
			// );
		}
		return replacementNode;
	}
	return node as N;
}
