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

export interface CodePayload {
  key?: NodeKey;
  language: string;
}

export type SerializedCodeNode = Spread<
  {
    language: string;
  },
  SerializedLexicalNode
>;

/**
    * A node that represents a code block
    `files`: The files that are present in the code block
    `result`: The result from running the code block
        `id`: The id of the result. A new id is generated on the backend whenever a result is outputted. It is used in the animation of the code block result.
        `success`: Whether the code block ran successfully or not. It is used to make the text color default or red.
*/
export class CodeNode extends DecoratorNode<JSX.Element> {
  __language: string;

  static getType(): string {
    return 'code-block';
  }

  static clone(node: CodeNode): CodeNode {
    return new CodeNode(node.__language, node.__key);
  }

  static importJSON(serializedNode: SerializedCodeNode): CodeNode {
    const { language } = serializedNode;
    const node = $createCodeNode({
      language,
    });
    return node;
  }

  isInline(): false {
    return false;
  }

  constructor(language: string, key?: NodeKey) {
    super(key);
    // The language of the code
    this.__language = language;
  }

  exportJSON(): SerializedCodeNode {
    return {
      language: this.getLanguage(),
      type: 'code-block',
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

  getLanguage(): string {
    return this.__language;
  }

  setLanguage(language: string, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__language = language;
    });
  }

  decorate(): JSX.Element {
    return <div>{this.getLanguage()}</div>;
  }
}

export function $createCodeNode({ language }: CodePayload): CodeNode {
  return $applyNodeReplacement(new CodeNode(language));
}

export function $isCodeNode(
  node: LexicalNode | null | undefined
): node is CodeNode {
  return node instanceof CodeNode;
}
