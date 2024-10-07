import type {
	LexicalEditor,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import { Tag } from "../../tag";

export interface TagPayload {
	key?: NodeKey;
	tag: string;
}

export type SerializedTagNode = Spread<
	{
		tag: string;
	},
	SerializedLexicalNode
>;

export class TagNode extends DecoratorNode<JSX.Element> {
	__tag = "";

	static getType(): string {
		return "tag";
	}

	static clone(node: TagNode): TagNode {
		return new TagNode(node.__tag, node.getKey());
	}

	static importJSON(serializedNode: SerializedTagNode): TagNode {
		const { tag } = serializedNode;
		const node = $createTagNode({
			tag,
		});
		return node;
	}

	isInline(): boolean {
		return true;
	}

	constructor(tag: string, key?: NodeKey) {
		super(key);
		this.__tag = tag;
	}

	exportJSON(): SerializedTagNode {
		return {
			tag: this.getTag(),
			type: "tag",
			version: 1,
		};
	}

	// View
	createDOM(): HTMLElement {
		const span = document.createElement("span");
		return span;
	}

	updateDOM(): false {
		return false;
	}

	getTag(): string {
		return this.__tag;
	}

	decorate(_editor: LexicalEditor): JSX.Element {
		return <Tag tag={this.getTag()} nodeKey={this.getKey()} />;
	}
}

export function $createTagNode({ tag }: TagPayload): TagNode {
	return $applyNodeReplacement(new TagNode(tag));
}

export function $isTagNode(
	node: LexicalNode | null | undefined,
): node is TagNode {
	return node instanceof TagNode;
}
