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
import { Code } from '@components/code';
import type { Languages } from '@/types';

export interface CodePayload {
  id: string;
  key?: NodeKey;
  language: Languages;
  code: string;
  isCreatedNow?: boolean;
}

type SerializedCodeNode = Spread<
  {
    id: string;
    language: Languages;
    code: string;
  },
  SerializedLexicalNode
>;

export class CodeNode extends DecoratorNode<JSX.Element> {
  __id: string;
  __language: Languages;
  __code: string;
  // If a user creates the new code block via ```{language} or /{language} then __isCreatedNow is set to true`
  __isCreatedNow: boolean;

  static getType(): string {
    return 'code-block';
  }

  static clone(node: CodeNode): CodeNode {
    return new CodeNode({
      id: node.__id,
      language: node.__language,
      code: node.__code,
      isCreatedNow: node.__isCreatedNow,
      key: node.__key,
    });
  }

  static importJSON(serializedNode: SerializedCodeNode): CodeNode {
    const { id, language, code } = serializedNode;
    const node = $createCodeNode({
      id,
      language,
      code,
    });
    return node;
  }

  isInline(): false {
    return false;
  }

  constructor({
    id,
    language,
    code,
    isCreatedNow = false,
    key,
  }: {
    id: string;
    language: Languages;
    code: string;
    isCreatedNow?: boolean;
    key?: NodeKey;
  }) {
    super(key);

    this.__id = id;
    this.__language = language;
    this.__code = code;
    this.__isCreatedNow = isCreatedNow;
  }

  exportJSON(): SerializedCodeNode {
    return {
      id: this.getId(),
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

  getIsCreatedNow(): boolean {
    return this.__isCreatedNow;
  }

  getId(): string {
    return this.__id;
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
        setCode={(value: string) => this.setCode(value, _editor)}
        language={this.getLanguage()}
        nodeKey={this.getKey()}
        isCreatedNow={this.getIsCreatedNow()}
      />
    );
  }
}

export function $createCodeNode({
  id,
  language,
  code,
  isCreatedNow,
}: CodePayload): CodeNode {
  return $applyNodeReplacement(
    new CodeNode({
      id,
      language,
      code,
      isCreatedNow,
    })
  );
}

export function $isCodeNode(
  node: LexicalNode | null | undefined
): node is CodeNode {
  return node instanceof CodeNode;
}
