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
import { Suspense } from "react";
import { Video } from "../../video";
import type { ResizeWidth } from "./image";

export interface VideoPayload {
	title: string;
	width?: ResizeWidth;
	key?: NodeKey;
	src: string;
	subtitleUrl?: string;
}

function convertVideoElement(domNode: Node): null | DOMConversionOutput {
	const video = domNode as HTMLVideoElement;
	if (video.src.startsWith("file:///")) {
		return null;
	}
	const { title, src, width } = video;
	const node = $createVideoNode({ title, src, width });
	return { node };
}

export type SerializedVideoNode = Spread<
	{
		title: string;
		width?: ResizeWidth;
		subtitleUrl?: string;
		src: string;
	},
	SerializedLexicalNode
>;

export class VideoNode extends DecoratorNode<JSX.Element> {
	__src: string;
	__title: string;
	__width: ResizeWidth;
	__subtitleUrl?: string;

	static getType(): string {
		return "video";
	}

	static clone(node: VideoNode): VideoNode {
		return new VideoNode(node.__src, node.__title, node.__width, node.__key);
	}

	static importJSON(serializedNode: SerializedVideoNode): VideoNode {
		const { title, width, src, subtitleUrl } = serializedNode;
		const node = $createVideoNode({
			title,
			width,
			src,
			subtitleUrl,
		});
		return node;
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement("video");
		element.setAttribute("src", this.__src);
		element.setAttribute("title", this.__title);
		element.setAttribute("width", this.__width.toString());
		return { element };
	}

	static importDOM(): DOMConversionMap | null {
		return {
			img: () => ({
				conversion: convertVideoElement,
				priority: 0,
			}),
		};
	}

	constructor(
		src: string,
		title: string,
		width?: ResizeWidth,
		key?: NodeKey,
		subtitleUrl?: string,
	) {
		super(key);
		this.__src = src;
		this.__title = title;
		this.__width = width ?? "100%";
		this.__subtitleUrl = subtitleUrl;
	}

	exportJSON(): SerializedVideoNode {
		return {
			title: this.getTitleText(),
			width: this.getWidth(),
			src: this.getSrc(),
			type: "video",
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

	getWidth(): ResizeWidth {
		return this.__width;
	}

	getSubtitleUrl(): string | undefined {
		return this.__subtitleUrl;
	}

	setSubtitleUrl(subtitleUrl: string, editor: LexicalEditor): void {
		editor.update(() => {
			const writable = this.getWritable();
			writable.__subtitleUrl = subtitleUrl;
		});
	}

	setWidth(width: ResizeWidth, editor: LexicalEditor): void {
		editor.update(() => {
			const writable = this.getWritable();
			writable.__width = width;
		});
	}

	decorate(_editor: LexicalEditor): JSX.Element {
		return (
			<Suspense fallback={null}>
				<Video
					src={this.__src}
					widthWrittenToNode={this.getWidth()}
					writeWidthToNode={(width) => this.setWidth(width, _editor)}
					title={this.__title}
					nodeKey={this.getKey()}
					subtitleUrlWrittenToNode={this.getSubtitleUrl()}
					writeSubtitleUrlToNode={(subtitleUrl) =>
						this.setSubtitleUrl(subtitleUrl, _editor)
					}
				/>
			</Suspense>
		);
	}
}

export function $createVideoNode({
	title,
	src,
	width,
	key,
	subtitleUrl,
}: VideoPayload): VideoNode {
	return $applyNodeReplacement(
		new VideoNode(src, title, width, key, subtitleUrl),
	);
}

export function $isVideoNode(
	node: LexicalNode | null | undefined,
): node is VideoNode {
	return node instanceof VideoNode;
}
