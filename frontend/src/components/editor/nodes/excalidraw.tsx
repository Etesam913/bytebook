import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import type {
	EditorConfig,
	LexicalEditor,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type { ResizeWidth } from "../../../types";
import { ExcalidrawComponent } from "../../excalidraw";

export interface ExcalidrawPayload {
	key?: NodeKey;
	elements: ExcalidrawElement[];
	width?: ResizeWidth;
}

export type SerializedExcalidrawNode = Spread<
	{
		elements: ExcalidrawElement[];
		width?: ResizeWidth;
	},
	SerializedLexicalNode
>;

export class ExcalidrawNode extends DecoratorNode<JSX.Element> {
	__elements: ExcalidrawElement[] = [];
	__width: ResizeWidth;
	static getType(): string {
		return "excalidraw";
	}

	static clone(node: ExcalidrawNode): ExcalidrawNode {
		return new ExcalidrawNode(node.__elements);
	}

	static importJSON(serializedNode: SerializedExcalidrawNode): ExcalidrawNode {
		const { elements, width } = serializedNode;
		const node = $createExcalidrawNode({
			elements,
			width,
		});
		return node;
	}

	isInline(): false {
		return false;
	}

	constructor(
		elements: ExcalidrawElement[],
		width?: ResizeWidth,
		key?: NodeKey,
	) {
		super(key);
		this.__width = width ?? "100%";
		// The elements to populate the excalidraw instance with
		this.__elements = elements;
	}

	exportJSON(): SerializedExcalidrawNode {
		return {
			elements: this.getElements(),
			width: this.getWidth(),
			type: "excalidraw",
			version: 1,
		};
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

	getElements(): ExcalidrawElement[] {
		return this.__elements;
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
			<ExcalidrawComponent
				nodeKey={this.getKey()}
				widthWrittenToNode={this.getWidth()}
				writeWidthToNode={(width) => this.setWidth(width, _editor)}
			/>
		);
	}
}

export function $createExcalidrawNode({
	elements,
	width
}: ExcalidrawPayload): ExcalidrawNode {
	return $applyNodeReplacement(new ExcalidrawNode(elements, width));
}

export function $isExcalidrawNode(
	node: LexicalNode | null | undefined,
): node is ExcalidrawNode {
	return node instanceof ExcalidrawNode;
}
