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
import { useSendExecuteRequestMutation } from '../../hooks/code';
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
import { Languages } from '../../types';
import { motion } from 'motion/react';

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
  lastExecutedResult,
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
  lastExecutedResult: string | null;
}) {
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const { mutate: executeCode } = useSendExecuteRequestMutation(id, language);
  const debouncedSetCode = debounce(setCode, 300);
  const [, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const projectSettings = useAtomValue(projectSettingsAtom);

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
        run: () => {
          runCode(codeMirrorInstance, executeCode);
          return true;
        },
      },
      {
        key: 'Ctrl-Enter',
        run: () => {
          runCode(codeMirrorInstance, executeCode);
          return true;
        },
      },
      {
        key: 'Mod-Enter',
        run: () => {
          runCode(codeMirrorInstance, executeCode);
          return true;
        },
      },
    ])
  );

  function handleEditorRef(instance: ReactCodeMirrorRef | null) {
    setCodeMirrorInstance(instance);
    if (instance?.view && isCreatedNow) {
      instance.view.focus();
    }
  }
  const isExpandedAndHasResults = isExpanded && lastExecutedResult;
  const isExpandedAndDoesNotHaveResults = isExpanded && !lastExecutedResult;
  return (
    <motion.div layout="position" className="min-h-12">
      <CodeMirror
        ref={handleEditorRef}
        value={code}
        onChange={(newCode) => {
          debouncedSetCode(newCode);
        }}
        className={cn(
          'bg-white dark:bg-[#2e3440]',
          isExpandedAndHasResults && '!h-[65vh] max-h-[65vh]',
          isExpandedAndDoesNotHaveResults && 'h-[calc(100vh-3.6rem)]'
        )}
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
