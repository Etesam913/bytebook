import { vscodeLight } from '@uiw/codemirror-theme-vscode';
import { nord } from '@uiw/codemirror-theme-nord';
import { useAtomValue } from 'jotai/react';
import { isDarkModeOnAtom, projectSettingsAtom } from '../../atoms';
import CodeMirror, {
  keymap,
  Prec,
  type ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import { debounce } from '../../utils/general';
import {
  useSendExecuteRequestMutation,
  useSendInterruptRequestMutation,
} from '../../hooks/code';
import { runCode } from '../../utils/code';
import { focusEditor, languageToSettings } from '.';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { vim } from '@replit/codemirror-vim';
import {
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  LexicalEditor,
} from 'lexical';
import { cn } from '../../utils/string-formatting';
import { CodeBlockStatus, Languages } from '../../types';
import { motion } from 'motion/react';
import { UseMutateFunction } from '@tanstack/react-query';

function handleRunOrInterruptCode(
  status: CodeBlockStatus,
  interruptExecution: ({ newExecutionId }: { newExecutionId: string }) => void,
  codeMirrorInstance: ReactCodeMirrorRef | null,
  executeCode: UseMutateFunction<
    void,
    Error,
    {
      code: string;
      newExecutionId: string;
    },
    unknown
  >,
  setStatus: (status: CodeBlockStatus) => void,
  setLastExecutedResult: (result: string) => void
) {
  if (status === 'busy') {
    interruptExecution({
      newExecutionId: '',
    });
  } else {
    runCode(codeMirrorInstance, executeCode, setStatus, setLastExecutedResult);
  }
  return true;
}

export function CodeMirrorEditor({
  nodeKey,
  lexicalEditor,
  codeMirrorInstance,
  setCodeMirrorInstance,
  code,
  setCode,
  id,
  language,
  isCreatedNow,
  isExpanded,
  status,
  setStatus,
  setLastExecutedResult,
}: {
  nodeKey: string;
  lexicalEditor: LexicalEditor;
  codeMirrorInstance: ReactCodeMirrorRef | null;
  setCodeMirrorInstance: (instance: ReactCodeMirrorRef | null) => void;
  code: string;
  setCode: (code: string) => void;
  id: string;
  language: Languages;
  isCreatedNow: boolean;
  isExpanded: boolean;
  status: CodeBlockStatus;
  setStatus: (status: CodeBlockStatus) => void;
  setLastExecutedResult: (result: string) => void;
}) {
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const { mutate: executeCode } = useSendExecuteRequestMutation(id, language);
  const debouncedSetCode = debounce(setCode, 300);
  const [, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const projectSettings = useAtomValue(projectSettingsAtom);

  const { mutate: interruptExecution } = useSendInterruptRequestMutation(id);

  // Custom keymap for running code with keyboard shortcuts
  const runCodeKeymap = Prec.highest(
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
            interruptExecution,
            codeMirrorInstance,
            executeCode,
            setStatus,
            setLastExecutedResult
          ),
      },
      {
        key: 'Ctrl-Enter',
        run: () =>
          handleRunOrInterruptCode(
            status,
            interruptExecution,
            codeMirrorInstance,
            executeCode,
            setStatus,
            setLastExecutedResult
          ),
      },
      {
        key: 'Mod-Enter',
        run: () =>
          handleRunOrInterruptCode(
            status,
            interruptExecution,
            codeMirrorInstance,
            executeCode,
            setStatus,
            setLastExecutedResult
          ),
      },
    ])
  );

  function handleEditorRef(instance: ReactCodeMirrorRef | null) {
    setCodeMirrorInstance(instance);
    if (instance?.view && isCreatedNow) {
      instance.view.focus();
    }
  }
  return (
    <motion.div
      layout="position"
      className={cn('min-h-12', isExpanded && 'h-4/5')}
    >
      <CodeMirror
        ref={handleEditorRef}
        value={code}
        onChange={(newCode) => {
          debouncedSetCode(newCode);
        }}
        className="bg-white dark:bg-[#2e3440]"
        extensions={[
          projectSettings.codeBlockVimMode ? vim() : [],
          runCodeKeymap,
          languageToSettings[language].extension(),
        ]}
        theme={isDarkModeOn ? nord : vscodeLight}
        onKeyDown={(e) => {
          if (e.key === 'Backspace') {
            // Fixes weird bug where pressing backspace at beginning of first line focuses the <body> tag
            setTimeout(() => {
              focusEditor(codeMirrorInstance);
            }, 50);
          } else {
            // ArrowDown and ArrowUp are handled in the keybinding extension
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') {
              setSelected(true);
            }
            e.stopPropagation();
          }
        }}
        onClick={() => {
          clearSelection();
          setSelected(true);
        }}
        basicSetup={{
          foldGutter: false,
          lineNumbers: false,
          ...languageToSettings[language].basicSetup,
        }}
      />
    </motion.div>
  );
}
