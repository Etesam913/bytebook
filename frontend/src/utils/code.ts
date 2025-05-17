import { UseMutateFunction } from '@tanstack/react-query';
import { keymap, Prec, type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { CodeBlockStatus, Languages } from '../types';
import {
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  LexicalEditor,
} from 'lexical';

export function runCode(
  codeMirrorInstance: ReactCodeMirrorRef | null,
  executeCode: UseMutateFunction<
    void,
    Error,
    {
      code: string;
      newExecutionId: string;
    },
    unknown
  >
) {
  const newExecutionId = crypto.randomUUID();
  const code = codeMirrorInstance?.view?.state.doc.toString();
  if (code === null || code === undefined) return;
  executeCode({ code, newExecutionId });
}

function handleRunOrInterruptCode(
  status: CodeBlockStatus,
  codeBlockId: string,
  codeBlockLanguage: Languages,
  interruptExecution: ({
    newExecutionId,
    codeBlockId,
    codeBlockLanguage,
  }: {
    newExecutionId: string;
    codeBlockId: string;
    codeBlockLanguage: Languages;
  }) => void,
  codeMirrorInstance: ReactCodeMirrorRef | null,
  executeCode: UseMutateFunction<
    void,
    Error,
    {
      code: string;
      newExecutionId: string;
    },
    unknown
  >
) {
  if (status === 'busy') {
    interruptExecution({
      codeBlockId,
      codeBlockLanguage,
      newExecutionId: '',
    });
  } else {
    runCode(codeMirrorInstance, executeCode);
  }
  return true;
}

/**
 * Creates a keymap for CodeMirror with custom key bindings for code execution and navigation.
 *
 * @param options - Configuration options for the keymap
 * @param options.isExpanded - Whether the code block is in expanded view
 * @param options.lexicalEditor - The Lexical editor instance
 * @param options.status - Current execution status of the code block
 * @param options.id - Unique identifier for the code block
 * @param options.language - Programming language of the code block
 * @param options.interruptExecution - Function to interrupt code execution
 * @param options.codeMirrorInstance - Reference to the CodeMirror editor instance
 * @param options.executeCode - Function to execute the code in the editor
 * @param options.setSelected - Function to set the selection state of the node
 * @returns A CodeMirror keymap extension with custom key bindings
 */
export function getCodemirrorKeymap({
  isExpanded,
  lexicalEditor,
  status,
  id,
  language,
  interruptExecution,
  codeMirrorInstance,
  executeCode,
  setSelected,
}: {
  isExpanded: boolean;
  lexicalEditor: LexicalEditor;
  status: CodeBlockStatus;
  id: string;
  language: Languages;
  interruptExecution: ({
    newExecutionId,
    codeBlockId,
    codeBlockLanguage,
  }: {
    newExecutionId: string;
    codeBlockId: string;
    codeBlockLanguage: Languages;
  }) => void;
  codeMirrorInstance: ReactCodeMirrorRef | null;
  executeCode: UseMutateFunction<
    void,
    Error,
    {
      code: string;
      newExecutionId: string;
    },
    unknown
  >;
  setSelected: (selected: boolean) => void;
}) {
  return Prec.highest(
    keymap.of([
      {
        key: 'ArrowUp',
        run: (view) => {
          if (isExpanded) return false;
          // Get cursor position
          const cursorPos = view.state.selection.main.head;
          const currentLine = view.state.doc.lineAt(cursorPos).number - 1;
          // If on first line, handle specially
          if (currentLine <= 0) {
            // Just consume the event within CodeMirror
            const arrowUpEvent = new KeyboardEvent('keydown', {
              key: 'ArrowUp', // The key value (e.g., "ArrowUp")
              code: 'ArrowUp', // The physical key on the keyboard
              keyCode: 38, // Legacy property for older browsers (38 is the code for ArrowUp)
              which: 38, // Legacy property for older browsers
              bubbles: true, // Ensures the event bubbles up through the DOM
              cancelable: true, // Allows the event to be canceled (e.g., preventDefault)
            });

            lexicalEditor.update(() => {
              lexicalEditor.dispatchCommand(KEY_ARROW_UP_COMMAND, arrowUpEvent);
            });
            return false;
          }

          setSelected(true);
          // Return false to let CodeMirror handle it normally
          return false;
        },
      },
      {
        key: 'ArrowDown',
        run: (view) => {
          if (isExpanded) return false;
          const cursorPos = view.state.selection.main.head;
          const currentLine = view.state.doc.lineAt(cursorPos).number + 1;

          if (currentLine > view.state.doc.lines) {
            const arrowDownEvent = new KeyboardEvent('keydown', {
              key: 'ArrowDown',
              code: 'ArrowDown',
              keyCode: 40, // Legacy property for older browsers
              which: 40, // Legacy property for older browsers
              bubbles: true,
              cancelable: true,
            });
            lexicalEditor.update(() => {
              lexicalEditor.dispatchCommand(
                KEY_ARROW_DOWN_COMMAND,
                arrowDownEvent
              );
            });
            return true;
          }

          setSelected(true);
          return false;
        },
      },
      {
        key: 'Shift-Enter',
        run: () =>
          handleRunOrInterruptCode(
            status,
            id,
            language,
            interruptExecution,
            codeMirrorInstance,
            executeCode
          ),
      },
      {
        key: 'Ctrl-Enter',
        run: () =>
          handleRunOrInterruptCode(
            status,
            id,
            language,
            interruptExecution,
            codeMirrorInstance,
            executeCode
          ),
      },
      {
        key: 'Mod-Enter',
        run: () =>
          handleRunOrInterruptCode(
            status,
            id,
            language,
            interruptExecution,
            codeMirrorInstance,
            executeCode
          ),
      },
    ])
  );
}
