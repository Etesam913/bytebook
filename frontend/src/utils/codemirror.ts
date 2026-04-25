import { UseMutateFunction } from '@tanstack/react-query';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import type { CodeMirrorRef } from '../components/code/types';
import {
  CodeBlockStatus,
  KernelInstanceData,
  Languages,
  LanguagesWithKernels,
} from '../types';
import {
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  LexicalEditor,
} from 'lexical';
import { handleRunOrInterruptCode, type EnsureKernelFunction } from './code';
import { getDefaultStore } from 'jotai';
import { kernelInstancesAtom } from '../atoms';

/**
 * Looks up the live kernel instance for (noteId, language) in the global jotai store.
 * Used by codemirror keymap callbacks where we don't have a hooks context.
 */
function getInstanceForNote(
  noteId: string,
  language: LanguagesWithKernels
): KernelInstanceData | null {
  const all = getDefaultStore().get(kernelInstancesAtom);
  return (
    Object.values(all).find(
      (i) => i.noteId === noteId && i.language === language
    ) ?? null
  );
}

/**
 * Creates a keymap for CodeMirror with custom key bindings for code execution and navigation.
 */
export function getCodemirrorKeymap({
  isExpanded,
  lexicalEditor,
  status,
  id,
  noteId,
  language,
  kernelInstanceId,
  executeCode,
  interruptExecution,
  ensureKernel,
  codeMirrorInstance,
  setSelected,
  isExecutionEnabled = true,
}: {
  isExpanded: boolean;
  lexicalEditor: LexicalEditor;
  status: CodeBlockStatus;
  id: string;
  noteId: string;
  language: Languages;
  kernelInstanceId: string | null;
  interruptExecution: ({
    kernelInstanceId,
    newExecutionId,
    codeBlockId,
  }: {
    kernelInstanceId: string | null;
    newExecutionId: string;
    codeBlockId: string;
  }) => void;
  ensureKernel: EnsureKernelFunction;
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
  const runOrInterrupt = () => {
    if (!isExecutionEnabled) {
      return false;
    }
    return handleRunOrInterruptCode({
      status,
      noteId,
      codeBlockId: id,
      codeBlockLanguage: language,
      kernelInstanceId,
      getInstanceForNote,
      interruptExecution,
      codeMirrorInstance,
      executeCode,
      ensureKernel,
    });
  };

  return Prec.highest(
    keymap.of([
      {
        key: 'ArrowUp',
        run: (view) => {
          if (isExpanded) return false;
          const cursorPos = view.state.selection.main.head;
          const currentLine = view.state.doc.lineAt(cursorPos).number - 1;
          if (currentLine <= 0) {
            const arrowUpEvent = new KeyboardEvent('keydown', {
              key: 'ArrowUp',
              code: 'ArrowUp',
              keyCode: 38,
              which: 38,
              bubbles: true,
              cancelable: true,
            });
            lexicalEditor.update(() => {
              lexicalEditor.dispatchCommand(KEY_ARROW_UP_COMMAND, arrowUpEvent);
            });
            return false;
          }
          setSelected(true);
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
              keyCode: 40,
              which: 40,
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
      { key: 'Shift-Enter', run: runOrInterrupt },
      { key: 'Ctrl-Enter', run: runOrInterrupt },
      { key: 'Mod-Enter', run: runOrInterrupt },
      {
        key: 'Ctrl-c',
        run: () => {
          if (!isExecutionEnabled) return false;
          if (status === 'busy') {
            interruptExecution({
              kernelInstanceId,
              codeBlockId: id,
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
