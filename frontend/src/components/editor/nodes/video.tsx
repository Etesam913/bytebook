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
import { Video } from "../../video";

export interface VideoPayload {
	title: string;
	width?: number;
	height?: number;
	key?: NodeKey;
	src: string;
}

function convertVideoElement(domNode: Node): null | DOMConversionOutput {
	const video = domNode as HTMLVideoElement;
	if (video.src.startsWith("file:///")) {
		return null;
	}
	const { title, src, width, height } = video;
	const node = $createVideoNode({ title, src, width, height });
	return { node };
}

export type SerializedVideoNode = Spread<
	{
		title: string;
		width?: number;
		height?: number;
		src: string;
	},
	SerializedLexicalNode
>;

export class VideoNode extends DecoratorNode<JSX.Element> {
	__src: string;
	__title: string;
	__width: "inherit" | number;
	__height: "inherit" | number;

	static getType(): string {
		return "Video";
	}

	static clone(node: VideoNode): VideoNode {
		return new VideoNode(
			node.__src,
			node.__title,
			node.__width,
			node.__height,
			node.__key,
		);
	}

	static importJSON(serializedNode: SerializedVideoNode): VideoNode {
		const { title, width, height, src } = serializedNode;
		const node = $createVideoNode({
			title,
			width,
			height,
			src,
		});
		return node;
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement("img");
		element.setAttribute("src", this.__src);
		element.setAttribute("title", this.__title);
		element.setAttribute("width", this.__width.toString());
		element.setAttribute("height", this.__height.toString());
		return { element };
	}

	static importDOM(): DOMConversionMap | null {
		return {
			img: (node: Node) => ({
				conversion: convertVideoElement,
				priority: 0,
			}),
		};
	}

	constructor(
		src: string,
		title: string,
		width?: "inherit" | number,
		height?: "inherit" | number,
		key?: NodeKey,
	) {
		super(key);
		this.__src = src;
		this.__title = title;
		this.__width = width || "inherit";
		this.__height = height || "inherit";
	}

	exportJSON(): SerializedVideoNode {
		return {
			title: this.getTitleText(),
			width: this.__width === "inherit" ? 0 : this.__width,
			height: this.__height === "inherit" ? 0 : this.__height,
			src: this.getSrc(),
			type: "Video",
			version: 1,
		};
	}

	// View
	createDOM(config: EditorConfig): HTMLElement {
		const span = document.createElement("span");
		const theme = config.theme;
		const className = theme.Video;
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

	getTitleText(): string {
		return this.__title;
	}

	decorate(): JSX.Element {
		return (
			<Suspense fallback={null}>
				<Video
					src={this.__src}
					width={this.__width}
					height={this.__height}
					title={this.__title}
				/>
			</Suspense>
		);
	}
}

export function $createVideoNode({
	title,
	src,
	width,
	height,
	key,
}: VideoPayload): VideoNode {
	return $applyNodeReplacement(new VideoNode(src, title, width, height, key));
}

export function $isVideoNode(
	node: LexicalNode | null | undefined,
): node is VideoNode {
	return node instanceof VideoNode;
}
