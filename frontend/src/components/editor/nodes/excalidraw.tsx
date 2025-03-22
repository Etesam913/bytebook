import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import { $applyNodeReplacement, DecoratorNode } from 'lexical';
import { lazy, Suspense, type JSX } from 'react';
import type { ResizeWidth } from '../../../types';
import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';

const ExcalidrawComponentLazy = lazy(() =>
  import('../../excalidraw').then((module) => ({
    default: module.ExcalidrawComponent,
  }))
);

export interface ExcalidrawPayload {
  key?: NodeKey;
  elements: ExcalidrawElement[];
  width?: ResizeWidth;
  isCreatedNow?: boolean;
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
  __isCreatedNow: boolean;

  static getType(): string {
    return 'excalidraw';
  }

  static clone(node: ExcalidrawNode): ExcalidrawNode {
    return new ExcalidrawNode(
      node.__elements,
      node.__isCreatedNow,
      node.getKey()
    );
  }

  static importJSON(serializedNode: SerializedExcalidrawNode): ExcalidrawNode {
    const { elements } = serializedNode;
    return $createExcalidrawNode({
      elements,
    });
  }

  isInline(): false {
    return false;
  }

  constructor(
    elements: ExcalidrawElement[],
    isCreatedNow = false,
    key?: NodeKey
  ) {
    super(key);

    // The elements to populate the excalidraw instance with
    this.__elements = elements;
    this.__isCreatedNow = isCreatedNow;
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

  getIsCreatedNow(): boolean {
    return this.__isCreatedNow;
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
      <Suspense fallback={<div>Loading...</div>}>
        <ExcalidrawComponentLazy
          nodeKey={this.getKey()}
          isCreatedNow={this.getIsCreatedNow()}
          defaultElements={this.getElements()}
          writeElementsToNode={(elements: NonDeletedExcalidrawElement[]) => {
            this.setElements(elements, _editor);
          }}
        />
      </Suspense>
    );
  }
}

export function $createExcalidrawNode({
  elements,
  isCreatedNow,
}: ExcalidrawPayload): ExcalidrawNode {
  return $applyNodeReplacement(new ExcalidrawNode(elements, isCreatedNow));
}

export function $isExcalidrawNode(
  node: LexicalNode | null | undefined
): node is ExcalidrawNode {
  return node instanceof ExcalidrawNode;
}
