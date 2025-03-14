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
import { Code } from '../../code';

export type Languages = 'python' | 'go';
export const validLanguages = new Set<string>(['python', 'go']);

export interface CodePayload {
  key?: NodeKey;
  language: Languages;
  code: string;
}

export type SerializedCodeNode = Spread<
  {
    language: Languages;
    code: string;
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
  __language: Languages;
  __code: string;

  static getType(): string {
    return 'code-block';
  }

  static clone(node: CodeNode): CodeNode {
    return new CodeNode(node.__language, node.__code, node.__key);
  }

  static importJSON(serializedNode: SerializedCodeNode): CodeNode {
    const { language, code } = serializedNode;
    const node = $createCodeNode({
      language,
      code,
    });
    return node;
  }

  isInline(): false {
    return false;
  }

  constructor(language: Languages, code: string, key?: NodeKey) {
    super(key);
    // The language of the code
    this.__language = language;
    this.__code = code;
  }

  exportJSON(): SerializedCodeNode {
    return {
      language: this.getLanguage(),
      code: this.getCode(),
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

  getLanguage(): Languages {
    return this.__language;
  }

  getCode(): string {
    return this.__code;
  }

  setLanguage(language: Languages, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__language = language;
    });
  }

  setCode(code: string, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__code = code;
    });
  }

  decorate(_editor: LexicalEditor): JSX.Element {
    return (
      <Code
        code={this.getCode()}
        setCode={(code: string) => this.setCode(code, _editor)}
        language={this.getLanguage()}
        nodeKey={this.getKey()}
      />
    );
  }
}

export function $createCodeNode({ language, code }: CodePayload): CodeNode {
  return $applyNodeReplacement(new CodeNode(language, code));
}

export function $isCodeNode(
  node: LexicalNode | null | undefined
): node is CodeNode {
  return node instanceof CodeNode;
}
