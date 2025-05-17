import { vscodeLight } from '@uiw/codemirror-theme-vscode';
import { nord } from '@uiw/codemirror-theme-nord';
import { useAtomValue } from 'jotai/react';
import {
  isDarkModeOnAtom,
  noteSelectionAtom,
  projectSettingsAtom,
} from '../../atoms';
import CodeMirror, {
  type ReactCodeMirrorRef,
  EditorView,
} from '@uiw/react-codemirror';
import { debounce } from '../../utils/general';
import {
  useSendExecuteRequestMutation,
  useSendInterruptRequestMutation,
} from '../../hooks/code';
import { getCodemirrorKeymap } from '../../utils/code';
import { focusEditor, languageToSettings } from '.';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { vim, getCM, Vim, CodeMirrorV } from '@replit/codemirror-vim';
import { $isNodeSelection, LexicalEditor } from 'lexical';
import { cn } from '../../utils/string-formatting';
import { CodeBlockStatus, Languages } from '../../types';

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
}) {
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const { mutate: executeCode } = useSendExecuteRequestMutation(
    id,
    language,
    setStatus
  );
  const debouncedSetCode = debounce(setCode, 300);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const [, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const { mutate: interruptExecution } = useSendInterruptRequestMutation();
  const noteSelection = useAtomValue(noteSelectionAtom);

  function handleEditorRef(instance: ReactCodeMirrorRef | null) {
    setCodeMirrorInstance(instance);
    if (instance?.view && isCreatedNow) {
      instance.view.focus();
    }
  }

  const runCodeKeymap = getCodemirrorKeymap({
    isExpanded,
    lexicalEditor,
    status,
    id,
    language,
    interruptExecution,
    codeMirrorInstance,
    executeCode,
    setSelected,
  });

  return (
    <div
      onClick={() => {
        // Refocuses the editor when clicks happen outside of it but still inside the overall component
        if (codeMirrorInstance?.view) {
          codeMirrorInstance.view.focus();
          setSelected(true);
        }
      }}
      className={cn('min-h-12', isExpanded && 'flex-1 overflow-y-auto')}
      onKeyDownCapture={(e) => {
        if (
          projectSettings.code.codeBlockVimMode &&
          e.key === 'Escape' &&
          codeMirrorInstance?.view
        ) {
          // Ensures that the editor goes into normal mode when escape is pressed
          // Previously, the editor would remain in insert mode after pressing escape
          // when autocomplete suggestions were showing.
          const codeMirrorVim = getCM(codeMirrorInstance.view);
          if (codeMirrorVim) {
            Vim.exitInsertMode(codeMirrorVim as CodeMirrorV);
          }
        }
      }}
    >
      <CodeMirror
        ref={handleEditorRef}
        value={code}
        onChange={(newCode) => {
          debouncedSetCode(newCode);
        }}
        className="bg-white dark:bg-[#2e3440]"
        extensions={[
          EditorView.editable.of($isNodeSelection(noteSelection)),
          projectSettings.code.codeBlockVimMode ? vim() : [],
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
        onClick={(e) => {
          clearSelection();
          setSelected(true);
          e.stopPropagation();
        }}
        basicSetup={{
          lineNumbers: false,
          ...languageToSettings[language].basicSetup,
        }}
      />
    </div>
  );
}
