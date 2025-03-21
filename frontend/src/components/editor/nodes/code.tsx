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
  id: string;
  key?: NodeKey;
  language: Languages;
  code: string;
  isCreatedNow?: boolean;
  isCollapsed?: boolean;
  lastExecutedResult?: string | null;
}

export type SerializedCodeNode = Spread<
  {
    id: string;
    language: Languages;
    code: string;
    lastExecutedResult: string | null;
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
  __id: string;
  __language: Languages;
  __executionId: string;
  __code: string;
  __isCollapsed: boolean;
  // If a user creates the new code block via ```{language} or /{language} then __isCreatedNow is set to true`
  __isCreatedNow: boolean;
  __lastExecutedResult: string | null;
  static getType(): string {
    return 'code-block';
  }

  static clone(node: CodeNode): CodeNode {
    return new CodeNode(
      node.__id,
      node.__language,
      node.__code,
      node.__isCollapsed,
      node.__isCreatedNow,
      node.__lastExecutedResult,
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedCodeNode): CodeNode {
    const { id, language, code, lastExecutedResult } = serializedNode;
    const node = $createCodeNode({
      id,
      language,
      code,
      lastExecutedResult,
    });
    return node;
  }

  isInline(): false {
    return false;
  }

  constructor(
    id: string,
    language: Languages,
    code: string,
    isCollapsed = false,
    isCreatedNow = false,
    lastExecutedResult: string | null = null,
    key?: NodeKey
  ) {
    super(key);

    this.__id = id;
    this.__language = language;
    this.__code = code;
    this.__executionId = crypto.randomUUID();
    this.__isCollapsed = isCollapsed;
    this.__isCreatedNow = isCreatedNow;
    this.__lastExecutedResult = lastExecutedResult;
  }

  exportJSON(): SerializedCodeNode {
    return {
      id: this.getId(),
      language: this.getLanguage(),
      code: this.getCode(),
      lastExecutedResult: this.getLastExecutedResult(),
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

  getIsCollapsed(): boolean {
    return this.__isCollapsed;
  }

  getIsCreatedNow(): boolean {
    return this.__isCreatedNow;
  }

  getLastExecutedResult(): string | null {
    return this.__lastExecutedResult;
  }

  setTracebackResult(tracebackHTML: string, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__lastExecutedResult += tracebackHTML;
    });
  }

  setStreamResult(streamText: string, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__lastExecutedResult += `<div>${streamText}</div>`;
    });
  }
  setLastExecutedResult(result: string, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__lastExecutedResult = result;
    });
  }

  getId(): string {
    return this.__id;
  }

  setLanguage(language: Languages, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__language = language;
    });
  }

  getExecutionId() {
    return this.__executionId;
  }

  setExecutionId(executionId: string, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__executionId = executionId;
    });
  }

  setCode(code: string, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__code = code;
    });
  }

  setIsCollapsed(isCollapsed: boolean, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__isCollapsed = isCollapsed;
    });
  }

  decorate(_editor: LexicalEditor): JSX.Element {
    return (
      <Code
        id={this.getId()}
        setExecutionId={(executionId: string) =>
          this.setExecutionId(executionId, _editor)
        }
        code={this.getCode()}
        setCode={(code: string) => this.setCode(code, _editor)}
        language={this.getLanguage()}
        nodeKey={this.getKey()}
        isCreatedNow={this.getIsCreatedNow()}
        isCollapsed={this.getIsCollapsed()}
        lastExecutedResult={this.getLastExecutedResult()}
        setIsCollapsed={(isCollapsed: boolean) =>
          this.setIsCollapsed(isCollapsed, _editor)
        }
      />
    );
  }
}

export function $createCodeNode({
  id,
  language,
  code,
  isCollapsed,
  isCreatedNow,
}: CodePayload): CodeNode {
  return $applyNodeReplacement(
    new CodeNode(id, language, code, isCollapsed, isCreatedNow)
  );
}

export function $isCodeNode(
  node: LexicalNode | null | undefined
): node is CodeNode {
  return node instanceof CodeNode;
}
