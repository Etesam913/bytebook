import { UseMutateFunction } from '@tanstack/react-query';
import { keymap, Prec } from '@uiw/react-codemirror';
import type { CodeMirrorRef } from '../components/code/types';
import { CodeBlockStatus, Languages } from '../types';
import {
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  LexicalEditor,
} from 'lexical';
import { handleRunOrInterruptCode, type TurnOnKernelFunction } from './code';
import { getDefaultStore } from 'jotai';
import { kernelsDataAtom } from '../atoms';

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
 * @param options.executeCode - Function to execute the code in the editor
 * @param options.turnOnKernel - Function to turn on the kernel for the code block
 * @param options.codeMirrorInstance - Reference to the CodeMirror editor instance
 * @param options.setSelected - Function to set the selection state of the node
 * @param options.isExecutionEnabled - Whether execution keyboard shortcuts should be enabled
 * @returns A CodeMirror keymap extension with custom key bindings
 */
export function getCodemirrorKeymap({
  isExpanded,
  lexicalEditor,
  status,
  id,
  language,
  executeCode,
  interruptExecution,
  turnOnKernel,
  codeMirrorInstance,
  setSelected,
  isExecutionEnabled = true,
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
  turnOnKernel: TurnOnKernelFunction;
  codeMirrorInstance: CodeMirrorRef;
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
  isExecutionEnabled?: boolean;
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
        run: () => {
          if (!isExecutionEnabled) {
            return false;
          }
          return handleRunOrInterruptCode({
            status,
            codeBlockId: id,
            codeBlockLanguage: language,
            interruptExecution,
            codeMirrorInstance,
            executeCode,
            getKernelsData: () => getDefaultStore().get(kernelsDataAtom),
            turnOnKernel,
          });
        },
      },
      {
        key: 'Ctrl-Enter',
        run: () => {
          if (!isExecutionEnabled) {
            return false;
          }
          return handleRunOrInterruptCode({
            status,
            codeBlockId: id,
            codeBlockLanguage: language,
            interruptExecution,
            codeMirrorInstance,
            executeCode,
            getKernelsData: () => getDefaultStore().get(kernelsDataAtom),
            turnOnKernel,
          });
        },
      },
      {
        key: 'Mod-Enter',
        run: () => {
          if (!isExecutionEnabled) {
            return false;
          }
          return handleRunOrInterruptCode({
            status,
            codeBlockId: id,
            codeBlockLanguage: language,
            interruptExecution,
            codeMirrorInstance,
            executeCode,
            getKernelsData: () => getDefaultStore().get(kernelsDataAtom),
            turnOnKernel,
          });
        },
      },
      {
        key: 'Ctrl-c',
        run: () => {
          if (!isExecutionEnabled) {
            return false;
          }
          if (status === 'busy') {
            interruptExecution({
              codeBlockId: id,
              codeBlockLanguage: language,
              newExecutionId: '',
            });
            return true;
          }
          return false;
        },
      },
    ])
  );
}
