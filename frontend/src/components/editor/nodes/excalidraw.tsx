import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import { $applyNodeReplacement, DecoratorNode } from 'lexical';
import type { JSX } from 'react';
import type { ResizeWidth } from '../../../types';
import { ExcalidrawComponent } from '../../excalidraw';
import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';

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

  static getType(): string {
    return 'excalidraw';
  }

  static clone(node: ExcalidrawNode): ExcalidrawNode {
    return new ExcalidrawNode(node.__elements, node.getKey());
  }

  static importJSON(serializedNode: SerializedExcalidrawNode): ExcalidrawNode {
    const { elements } = serializedNode;
    const node = $createExcalidrawNode({
      elements,
    });
    return node;
  }

  isInline(): false {
    return false;
  }

  constructor(elements: ExcalidrawElement[], key?: NodeKey) {
    super(key);

    // The elements to populate the excalidraw instance with
    this.__elements = elements;
  }

  exportJSON(): SerializedExcalidrawNode {
    return {
      elements: this.getElements(),
      type: 'excalidraw',
      version: 1,
    };
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
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
  setElements(
    elements: NonDeletedExcalidrawElement[],
    editor: LexicalEditor
  ): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__elements = elements;
    });
  }

  decorate(_editor: LexicalEditor): JSX.Element {
    return (
      <ExcalidrawComponent
        nodeKey={this.getKey()}
        defaultElements={this.getElements()}
        writeElementsToNode={(elements: NonDeletedExcalidrawElement[]) => {
          this.setElements(elements, _editor);
        }}
      />
    );
  }
}

export function $createExcalidrawNode({
  elements,
}: ExcalidrawPayload): ExcalidrawNode {
  return $applyNodeReplacement(new ExcalidrawNode(elements));
}

export function $isExcalidrawNode(
  node: LexicalNode | null | undefined
): node is ExcalidrawNode {
  return node instanceof ExcalidrawNode;
}
