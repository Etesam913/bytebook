import { vscodeLight } from '@uiw/codemirror-theme-vscode';
import { nord } from '@uiw/codemirror-theme-nord';
import { useAtomValue } from 'jotai/react';
import { isDarkModeOnAtom, projectSettingsAtom } from '../../atoms';
import CodeMirror, {
  type ReactCodeMirrorRef,
  EditorView,
} from '@uiw/react-codemirror';
import { debounce } from '../../utils/general';
import {
  useSendExecuteRequestMutation,
  useSendInterruptRequestMutation,
  useCompletionSource,
} from '../../hooks/code';
import { getCodemirrorKeymap } from '../../utils/code';
import { focusEditor, languageToSettings } from '.';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { vim, getCM, Vim, CodeMirrorV } from '@replit/codemirror-vim';
import { LexicalEditor } from 'lexical';
import { cn } from '../../utils/string-formatting';
import { CodeBlockStatus, Languages, CompletionData } from '../../types';
import { autocompletion } from '@codemirror/autocomplete';
import { useNodeInNodeSelection } from '../../hooks/lexical';
import { useEffect } from 'react';

// Map to store pending completion promises by messageId
const pendingCompletions = new Map<string, (data: CompletionData) => void>();

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

  const completionSource = useCompletionSource(
    id,
    '1',
    language,
    pendingCompletions
  );
  const debouncedSetCode = debounce(setCode, 300);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const [, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const { mutate: interruptExecution } = useSendInterruptRequestMutation();
  const isInNodeSelection = useNodeInNodeSelection(lexicalEditor, nodeKey);

  function handleEditorRef(instance: ReactCodeMirrorRef | null) {
    setCodeMirrorInstance(instance);
    if (instance?.view && isCreatedNow) {
      instance.view.focus();
    }
  }

  useEffect(() => {
    // Focuses the editor when the node is selected
    if (codeMirrorInstance?.view && isInNodeSelection) {
      codeMirrorInstance.view.focus();
    }
  }, [codeMirrorInstance, isInNodeSelection]);

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
          EditorView.editable.of(isInNodeSelection),
          projectSettings.code.codeBlockVimMode ? vim() : [],
          runCodeKeymap,
          languageToSettings[language].extension(),
          autocompletion({
            override: [completionSource],
            activateOnTypingDelay: 50,
          }),
        ]}
        theme={isDarkModeOn ? nord : vscodeLight}
        onKeyDown={(e) => {
          if (e.key === 'Backspace') {
            //  TODO: Think of a better fix than this, Fixes weird bug where pressing backspace at beginning of first line focuses the <body> tag
            setTimeout(() => {
              focusEditor(codeMirrorInstance);
            }, 5);
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
          lineNumbers: true,
          ...languageToSettings[language].basicSetup,
        }}
      />
    </div>
  );
}
