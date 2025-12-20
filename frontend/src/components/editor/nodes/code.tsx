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
  hideResults?: boolean;
}

type SerializedCodeNode = Spread<
  {
    id: string;
    language: Languages;
    code: string;
    lastExecutedResult: string | null;
    hideResults?: boolean;
  },
  SerializedLexicalNode
>;

type InputPrompt = {
  prompt: string;
  isPassword: boolean;
};

const MAX_CODE_RESULT_LENGTH = 10000;

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
  __hideResults: boolean;
  __isWaitingForInput: boolean;
  __executionCount: number;
  __duration: string;

  static getType(): string {
    return 'code-block';
  }

  static clone(node: CodeNode): CodeNode {
    return new CodeNode({
      id: node.__id,
      language: node.__language,
      code: node.__code,
      isCreatedNow: node.__isCreatedNow,
      lastExecutedResult: node.__lastExecutedResult,
      status: node.__status,
      executionId: node.__executionId,
      executionCount: node.__executionCount,
      duration: node.__duration,
      hideResults: node.__hideResults,
      isWaitingForInput: node.__isWaitingForInput,
      key: node.__key,
    });
  }

  static importJSON(serializedNode: SerializedCodeNode): CodeNode {
    const { id, language, code, lastExecutedResult, hideResults } =
      serializedNode;
    const node = $createCodeNode({
      id,
      language,
      code,
      lastExecutedResult,
      hideResults,
      // Hardcoding status:idle ensures that that when cmd+z recreates a code block, it is not in the loading state
      status: 'idle',
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
    lastExecutedResult = null,
    status = 'idle',
    executionId,
    executionCount = 0,
    duration = '',
    isWaitingForInput = false,
    hideResults = false,
    key,
  }: {
    id: string;
    language: Languages;
    code: string;
    isCreatedNow?: boolean;
    lastExecutedResult?: string | null;
    status?: CodeBlockStatus;
    executionId?: string;
    executionCount?: number;
    duration?: string;
    isWaitingForInput?: boolean;
    hideResults?: boolean;
    key?: NodeKey;
  }) {
    super(key);

    this.__id = id;
    this.__language = language;
    this.__code = code;
    this.__executionId = executionId ?? crypto.randomUUID();
    this.__isCreatedNow = isCreatedNow;
    this.__lastExecutedResult = lastExecutedResult;
    this.__status = status;
    this.__isWaitingForInput = isWaitingForInput;
    this.__executionCount = executionCount;
    this.__duration = duration;
    this.__hideResults = hideResults;
  }

  exportJSON(): SerializedCodeNode {
    return {
      id: this.getId(),
      language: this.getLanguage(),
      code: this.getCode(),
      lastExecutedResult: this.getLastExecutedResult(),
      hideResults: this.getHideResults(),
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

  getHideResults(): boolean {
    return this.__hideResults;
  }

  getIsWaitingForInput(): boolean {
    return this.__isWaitingForInput;
  }

  setTracebackResult(tracebackHTML: string, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__lastExecutedResult += tracebackHTML;
    });
  }

  setDisplayResult(
    mimeTypeToData: Record<string, string>,
    editor: LexicalEditor
  ): void {
    editor.update(() => {
      const writable = this.getWritable();
      // 1. If there's HTML, show that
      if (mimeTypeToData['text/html']) {
        writable.__lastExecutedResult = mimeTypeToData['text/html'];
        return;
      }
      // 2. Otherwise, if there's an image, show that
      const imageEntry = Object.entries(mimeTypeToData).find(([mt]) =>
        mt.startsWith('image/')
      );
      if (imageEntry) {
        const [mt, data] = imageEntry;
        writable.__lastExecutedResult = `<img src="data:${mt};base64,${data}" alt="result"/>`;
        return;
      }
      // 3. Fallback to plain text
      if (mimeTypeToData['text/plain']) {
        writable.__lastExecutedResult = `<pre>${mimeTypeToData['text/plain']}</pre>`;
        return;
      }
      // 4. Anything else, just dump it
      Object.values(mimeTypeToData).forEach((data) => {
        writable.__lastExecutedResult = `<div>${data}</div>`;
      });
    });
  }

  setExecutionResult(executionResult: string, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      const lengthOfResult = writable.__lastExecutedResult?.length ?? 0;
      if (lengthOfResult >= MAX_CODE_RESULT_LENGTH) {
        return;
      }
      const newResultLength = lengthOfResult + executionResult.length;
      if (newResultLength >= MAX_CODE_RESULT_LENGTH) {
        writable.__lastExecutedResult += `<div>${executionResult}</div>`;
        writable.__lastExecutedResult =
          writable.__lastExecutedResult?.slice(0, MAX_CODE_RESULT_LENGTH) +
          `<div>Result too long, truncated</div>`;
      } else {
        writable.__lastExecutedResult += `<div>${executionResult}</div>`;
      }
    });
  }

  setStreamResult(streamText: string, editor: LexicalEditor): void {
    this.setExecutionResult(streamText, editor);
  }

  setIsWaitingForInput(
    isWaitingForInput: boolean,
    editor: LexicalEditor
  ): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__isWaitingForInput = isWaitingForInput;
    });
  }
  setInputPrompt(inputPrompt: InputPrompt, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      this.setIsWaitingForInput(true, editor);

      writable.__lastExecutedResult += `<div class="prompt-block flex gap-2 items-center flex-wrap"><label>${inputPrompt.prompt}</label><span><input class="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-1" type="${
        inputPrompt.isPassword ? 'password' : 'text'
      }"/><button type="submit" class="ml-2 px-2 py-1 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600">Submit</button></span></div>`;
    });
  }

  setLastExecutedResult(
    lastExecutedResult: string,
    editor: LexicalEditor
  ): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__lastExecutedResult = lastExecutedResult;
    });
  }

  resetLastExecutedResult(editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__lastExecutedResult = '';
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

  setHideResults(hideResults: boolean, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__hideResults = hideResults;
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
        setLastExecutedResult={(lastExecutedResult: string) =>
          this.setLastExecutedResult(lastExecutedResult, _editor)
        }
        hideResults={this.getHideResults()}
        setHideResults={(hideResults: boolean) =>
          this.setHideResults(hideResults, _editor)
        }
        isWaitingForInput={this.getIsWaitingForInput()}
        setIsWaitingForInput={(isWaitingForInput: boolean) =>
          this.setIsWaitingForInput(isWaitingForInput, _editor)
        }
        executionCount={this.getExecutionCount()}
        durationText={this.getDuration()}
        executionId={this.getExecutionId()}
      />
    );
  }

  getExecutionCount(): number {
    return this.__executionCount;
  }

  setExecutionCount(executionCount: number, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__executionCount = executionCount;
    });
  }

  getDuration(): string {
    return this.__duration;
  }

  setDuration(duration: string, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__duration = duration;
    });
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
  hideResults = false,
}: CodePayload): CodeNode {
  return $applyNodeReplacement(
    new CodeNode({
      id,
      language,
      code,
      isCreatedNow,
      lastExecutedResult,
      status,
      executionId,
      executionCount: 0,
      duration: '',
      isWaitingForInput: false,
      hideResults,
    })
  );
}

export function $isCodeNode(
  node: LexicalNode | null | undefined
): node is CodeNode {
  return node instanceof CodeNode;
}
