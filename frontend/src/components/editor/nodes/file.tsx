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
import Pdf from "../../pdf";
import { UnknownAttachment } from "../../unknown-attachment";
import { Video } from "../../video";
import { YouTube } from "../../youtube";

export type FileType = "image" | "video" | "pdf" | "youtube" | "unknown";

export interface FilePayload {
	alt: string;
	elementType: FileType;
	width?: ResizeWidth;
	isLoading?: boolean;
	key?: NodeKey;
	src: string;
}

// I think this runs on copy and paste
function convertFileElement(domNode: HTMLElement): null | DOMConversionOutput {
	const parentNode = $createParagraphNode();
	if (domNode.tagName === "IMG") {
		const image = domNode as HTMLImageElement;
		if (image.src.startsWith("file:///")) {
			return null;
		}
		const { alt, src } = image;
		const node = $createFileNode({
			alt,
			src,
			// isLoading maybe should be true, go back to this 👇
			isLoading: false,
			width: "100%",
			elementType: "image",
		});
		parentNode.append(node);
		return { node: node };
	}
	if (domNode.tagName === "VIDEO") {
		const video = domNode as HTMLVideoElement;
		const { src, title } = video;
		const node = $createFileNode({
			alt: title,
			src,
			width: "100%",
			elementType: "video",
		});
		parentNode.append(node);
		return { node: node };
	}

	const unknown = $createFileNode({
		alt: "Unknown",
		src: "",
		width: "100%",
		elementType: "unknown",
	});
	parentNode.append(unknown);

	return { node: unknown };
}

export type SerializedFileNode = Spread<
	{
		alt: string;
		width?: ResizeWidth;
		isLoading?: boolean;
		src: string;
		elementType: FileType;
	},
	SerializedLexicalNode
>;

export class FileNode extends DecoratorNode<JSX.Element> {
	__src: string;
	__alt: string;
	__width: ResizeWidth;
	__isLoading: boolean;
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
			node.__isLoading,
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
		isLoading?: boolean,
		key?: NodeKey,
	) {
		super(key);
		this.__src = src;
		this.__alt = alt;
		this.__width = width ?? "100%";
		this.__isLoading = isLoading ?? true;
		this.__elementType = elementType;
	}

	exportJSON(): SerializedFileNode {
		return {
			alt: this.getAltText(),
			width: this.getWidth(),
			isLoading: this.__isLoading,
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
	setLoading(isLoading: boolean, editor: LexicalEditor) {
		editor.update(() => {
			const writable = this.getWritable();
			writable.__isLoading = isLoading;
		});
	}

	getLoading(): boolean {
		return this.__isLoading;
	}

	setWidth(width: ResizeWidth, editor: LexicalEditor): void {
		editor.update(() => {
			const writable = this.getWritable();
			writable.__width = width;
		});
	}

	decorate(_editor: LexicalEditor): JSX.Element {
		if (this.getElementType() === "video") {
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
		if (this.getElementType() === "image") {
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
		if (this.getElementType() === "youtube") {
			return (
				<YouTube
					src={this.getSrc()}
					alt={this.getAltText()}
					nodeKey={this.getKey()}
					widthWrittenToNode={this.getWidth()}
					writeWidthToNode={(width) => this.setWidth(width, _editor)}
				/>
			);
		}

		if (this.getElementType() === "pdf") {
			return (
				<Pdf
					src={this.getSrc()}
					alt={this.getAltText()}
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
	isLoading,
	key,
}: FilePayload): FileNode {
	return $applyNodeReplacement(
		new FileNode(src, alt, elementType, width, isLoading, key),
	);
}

export function $isFileNode(
	node: LexicalNode | null | undefined,
): node is FileNode {
	return node instanceof FileNode;
}
