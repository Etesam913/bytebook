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
import { UnknownAttachment } from "../../unknown-attachment";
import { Video } from "../../video";

export type FileType = "image" | "video" | "unknown";

export interface FilePayload {
	alt: string;
	elementType: FileType;
	width?: ResizeWidth;
	key?: NodeKey;
	src: string;
}

function convertFileElement(domNode: Node): null | DOMConversionOutput {
	const img = domNode as HTMLImageElement & {
		elementType: FileType;
	};

	if (img.src.startsWith("file:///")) {
		return null;
	}
	const { alt, src, width, elementType } = img;
	const node = $createFileNode({ alt, src, width, elementType });
	const parentNode = $createParagraphNode();
	parentNode.append(node);
	return { node: node };
}

export type SerializedFileNode = Spread<
	{
		alt: string;
		width?: ResizeWidth;
		src: string;
		elementType: FileType;
	},
	SerializedLexicalNode
>;

export class FileNode extends DecoratorNode<JSX.Element> {
	__src: string;
	__alt: string;
	__width: ResizeWidth;
	__elementType: FileType;

	static getType(): string {
		return "file";
	}

	static clone(node: FileNode): FileNode {
		return new FileNode(
			node.__src,
			node.__alt,
			node.__elementType,
			node.__width,
			node.__key,
		);
	}

	static importJSON(serializedNode: SerializedFileNode): FileNode {
		const { alt, width, src, elementType } = serializedNode;
		const node = $createFileNode({
			alt,
			width,
			src,
			elementType,
		});
		return node;
	}

	exportDOM(): DOMExportOutput {
		let element = null;
		if (this.__elementType === "image") {
			element = document.createElement("img");
			element.setAttribute("src", this.__src);
			element.setAttribute("alt", this.__alt);
			element.setAttribute("width", this.__width.toString());
		}
		if (this.__elementType === "video") {
			element = document.createElement("video");
			element.setAttribute("src", this.__src);
			element.setAttribute("title", this.__alt);
			element.setAttribute("width", this.__width.toString());
		}

		return { element };
	}

	static importDOM(): DOMConversionMap | null {
		return {
			img: () => ({
				conversion: convertFileElement,
				priority: 0,
			}),
		};
	}

	constructor(
		src: string,
		alt: string,
		elementType: FileType,
		width?: ResizeWidth,
		key?: NodeKey,
	) {
		super(key);
		this.__src = src;
		this.__alt = alt;
		this.__width = width ?? "100%";
		this.__elementType = elementType;
	}

	exportJSON(): SerializedFileNode {
		return {
			alt: this.getAltText(),
			width: this.getWidth(),
			src: this.getSrc(),
			elementType: this.__elementType,
			type: "file",
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

	getElementType(): FileType {
		return this.__elementType;
	}

	setWidth(width: ResizeWidth, editor: LexicalEditor): void {
		editor.update(() => {
			const writable = this.getWritable();
			writable.__width = width;
		});
	}

	decorate(_editor: LexicalEditor): JSX.Element {
		if (this.__elementType === "video") {
			return (
				<Video
					src={this.__src}
					widthWrittenToNode={this.getWidth()}
					writeWidthToNode={(width) => this.setWidth(width, _editor)}
					title={this.getAltText()}
					nodeKey={this.getKey()}
				/>
			);
		}
		if (this.__elementType === "image") {
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
		// Replace with unknown attachment
		return <UnknownAttachment nodeKey={this.getKey()} src={this.getSrc()} />;
	}
}

export function $createFileNode({
	alt,
	elementType,
	src,
	width,
	key,
}: FilePayload): FileNode {
	return $applyNodeReplacement(new FileNode(src, alt, elementType, width, key));
}

export function $isFileNode(
	node: LexicalNode | null | undefined,
): node is FileNode {
	return node instanceof FileNode;
}
