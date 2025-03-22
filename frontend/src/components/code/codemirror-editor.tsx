import { vscodeLight } from '@uiw/codemirror-theme-vscode';
import { nord } from '@uiw/codemirror-theme-nord';
import { lazy } from 'react';
import { useAtomValue } from 'jotai/react';
import { isDarkModeOnAtom } from '../../atoms';
import { keymap, Prec, ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { debounce } from '../../utils/general';
import { useSendExecuteRequestMutation } from '../../hooks/code';
import { runCode } from '../../utils/code';
import { focusEditor, languageToSettings } from '.';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { Languages } from '../editor/nodes/code';

const CodeMirror = lazy(() => import('@uiw/react-codemirror'));

export function CodeMirrorEditor({
  nodeKey,
  codeMirrorInstance,
  setCodeMirrorInstance,
  code,
  setCode,
  id,
  language,
  isCreatedNow,
}: {
  nodeKey: string;
  codeMirrorInstance: ReactCodeMirrorRef | null;
  setCodeMirrorInstance: (instance: ReactCodeMirrorRef | null) => void;
  code: string;
  setCode: (code: string) => void;
  id: string;
  language: Languages;
  isCreatedNow: boolean;
}) {
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const { mutate: executeCode } = useSendExecuteRequestMutation(id, language);
  const debouncedSetCode = debounce(setCode, 300);
  const [, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);

  // Custom keymap for running code with keyboard shortcuts
  const runCodeKeymap = Prec.highest(
    keymap.of([
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

  return (
    <CodeMirror
      ref={handleEditorRef}
      value={code}
      onChange={(newCode) => {
        debouncedSetCode(newCode);
      }}
      extensions={[runCodeKeymap, languageToSettings[language].extension()]}
      theme={isDarkModeOn ? nord : vscodeLight}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          document.getElementById('content-editable-editor')?.focus();
        } else if (e.key === 'Backspace') {
          // Fixes weird bug where pressing backspace at beginning of first line focuses the <body> tag
          setTimeout(() => {
            focusEditor(codeMirrorInstance);
          }, 50);
        } else {
          e.stopPropagation();
        }
      }}
      onClick={() => {
        clearSelection();
        setSelected(true);
      }}
      basicSetup={{
        foldGutter: false,
        ...languageToSettings[language].basicSetup,
      }}
    />
  );
}
