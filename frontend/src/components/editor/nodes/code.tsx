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
import { CodeBlockStatus, Languages } from '../../../types';

export interface CodePayload {
  id: string;
  key?: NodeKey;
  language: Languages;
  code: string;
  isCreatedNow?: boolean;
  lastExecutedResult?: string | null;
  status?: CodeBlockStatus;
  executionId?: string;
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
  // If a user creates the new code block via ```{language} or /{language} then __isCreatedNow is set to true`
  __isCreatedNow: boolean;
  __lastExecutedResult: string | null;
  __status: CodeBlockStatus;

  static getType(): string {
    return 'code-block';
  }

  static clone(node: CodeNode): CodeNode {
    return new CodeNode(
      node.__id,
      node.__language,
      node.__code,
      node.__isCreatedNow,
      node.__lastExecutedResult,
      node.__status,
      node.__executionId,
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
      // Hardcoding status:idle ensures that that when cmd+z recreates a code block, it is not in the loading state
      status: 'idle',
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
    isCreatedNow = false,
    lastExecutedResult: string | null = null,
    status: CodeBlockStatus = 'idle',
    executionId?: string,
    key?: NodeKey
  ) {
    super(key);

    this.__id = id;
    this.__language = language;
    this.__code = code;
    this.__executionId = executionId ?? crypto.randomUUID();
    this.__isCreatedNow = isCreatedNow;
    this.__lastExecutedResult = lastExecutedResult;
    this.__status = status;
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

  getStatus(): CodeBlockStatus {
    return this.__status;
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

  setDisplayResult(
    mimeTypeToData: Record<string, string>,
    editor: LexicalEditor
  ): void {
    editor.update(() => {
      const writable = this.getWritable();
      Object.entries(mimeTypeToData).forEach(([mimeType, data]) => {
        if (mimeType.startsWith('image/')) {
          // render images (PNG, JPEG…)
          writable.__lastExecutedResult += `<div><img src="data:${mimeType};base64,${data}" alt="${mimeType} result"/></div>`;
        } else if (mimeType === 'text/html') {
          // raw HTML
          writable.__lastExecutedResult += `<div>${data}</div>`;
        } else if (mimeType === 'text/plain') {
          // plain text
          writable.__lastExecutedResult += `<pre>${data}</pre>`;
        } else if (mimeType === 'application/json') {
          // JSON, pretty-printed
          try {
            const obj = JSON.parse(data);
            const pretty = JSON.stringify(obj, null, 2);
            writable.__lastExecutedResult += `<pre>${pretty}</pre>`;
          } catch {
            // fallback if it wasn’t valid JSON
            writable.__lastExecutedResult += `<pre>${data}</pre>`;
          }
        } else {
          // everything else
          writable.__lastExecutedResult += `<div>${data}</div>`;
        }
      });
    });
  }

  setExecutionResult(executionResult: string, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__lastExecutedResult += `<div>${executionResult}</div>`;
    });
  }

  setLastExecutedResult(result: string | null, editor: LexicalEditor): void {
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

  setStatus(status: CodeBlockStatus, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__status = status;
    });
  }

  decorate(_editor: LexicalEditor): JSX.Element {
    return (
      <Code
        id={this.getId()}
        code={this.getCode()}
        setCode={(code: string) => this.setCode(code, _editor)}
        status={this.getStatus()}
        setStatus={(status: CodeBlockStatus) => this.setStatus(status, _editor)}
        language={this.getLanguage()}
        nodeKey={this.getKey()}
        isCreatedNow={this.getIsCreatedNow()}
        lastExecutedResult={this.getLastExecutedResult()}
        setLastExecutedResult={(result: string | null) =>
          this.setLastExecutedResult(result, _editor)
        }
      />
    );
  }
}

export function $createCodeNode({
  id,
  language,
  code,
  isCreatedNow,
  lastExecutedResult,
  status = 'idle',
  executionId = crypto.randomUUID(),
}: CodePayload): CodeNode {
  return $applyNodeReplacement(
    new CodeNode(
      id,
      language,
      code,
      isCreatedNow,
      lastExecutedResult,
      status,
      executionId
    )
  );
}

export function $isCodeNode(
  node: LexicalNode | null | undefined
): node is CodeNode {
  return node instanceof CodeNode;
}
