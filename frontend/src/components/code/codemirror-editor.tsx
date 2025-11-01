import { vscodeLight } from '@uiw/codemirror-theme-vscode';
import { useAtomValue } from 'jotai/react';
import {
  isDarkModeOnAtom,
  projectSettingsAtom,
  kernelsDataAtom,
} from '../../atoms';
import CodeMirror, {
  type ReactCodeMirrorRef,
  EditorView,
} from '@uiw/react-codemirror';
import { debounce } from '../../utils/general';
import { atomone } from '@uiw/codemirror-theme-atomone';
import {
  useSendExecuteRequestMutation,
  useSendInterruptRequestMutation,
  useTurnOnKernelMutation,
} from '../../hooks/code';
import {
  useCompletionSource,
  useInspectTooltip,
} from '../../hooks/code-codemirror';
import { getCodemirrorKeymap } from '../../utils/codemirror';
import { focusEditor } from '.';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { vim, getCM, Vim, CodeMirrorV } from '@replit/codemirror-vim';
import { LexicalEditor } from 'lexical';
import { cn } from '../../utils/string-formatting';
import { CodeBlockStatus, Languages, CompletionData } from '../../types';
import { autocompletion } from '@codemirror/autocomplete';
import { useNodeInNodeSelection } from '../../hooks/lexical';
import { useEffect } from 'react';
import { langs } from '@uiw/codemirror-extensions-langs';
import type {
  Language,
  LanguageSupport,
  StreamLanguage,
} from '@codemirror/language';
import { javaLanguage } from '@codemirror/lang-java';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { pythonLanguage } from '@codemirror/lang-python';
import { languageDisplayConfig } from './language-config';
import type { BasicSetupOptions } from '@uiw/react-codemirror';

type LanguageSetting = {
  basicSetup?: BasicSetupOptions;
  extension: () => LanguageSupport | StreamLanguage<unknown> | [];
  language?: Language;
};

const languageToSettings: Record<Languages, LanguageSetting> = {
  python: {
    basicSetup: { tabSize: languageDisplayConfig.python.tabSize },
    extension: langs.py,
    language: pythonLanguage,
  },
  go: {
    basicSetup: { tabSize: languageDisplayConfig.go.tabSize },
    extension: langs.go,
  },
  javascript: {
    basicSetup: { tabSize: languageDisplayConfig.javascript.tabSize },
    extension: langs.js,
    language: javascriptLanguage,
  },
  java: {
    basicSetup: { tabSize: languageDisplayConfig.java.tabSize },
    extension: langs.java,
    language: javaLanguage,
  },
  text: {
    basicSetup: { tabSize: languageDisplayConfig.text.tabSize },
    extension: () => [],
  },
};

// Map to store pending completion promises by messageId
const pendingCompletions = new Map<string, (data: CompletionData) => void>();

// Map to store pending inspection promises by messageId
const pendingInspections = new Map<
  string,
  (data: { found: boolean; messageId: string; message: string }) => void
>();

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
  executionId,
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
  executionId: string;
}) {
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const kernelsData = useAtomValue(kernelsDataAtom);

  const { mutate: executeCode } = useSendExecuteRequestMutation(
    id,
    language,
    setStatus
  );

  const { mutate: interruptExecution } = useSendInterruptRequestMutation();

  const { mutate: turnOnKernel } = useTurnOnKernelMutation();

  const completionSource = useCompletionSource({
    id,
    executionId,
    language,
    pendingCompletions,
  });

  const inspectTooltip = useInspectTooltip({
    language,
    id,
    executionId,
    pendingInspections,
  });

  const debouncedSetCode = debounce(setCode, 300);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const [, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const isInNodeSelection = useNodeInNodeSelection(lexicalEditor, nodeKey);

  function handleEditorRef(instance: ReactCodeMirrorRef | null) {
    setCodeMirrorInstance(instance);
    if (instance?.view && isCreatedNow) {
      instance.view.focus();
    }
  }

  useEffect(() => {
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
    executeCode,
    interruptExecution,
    turnOnKernel,
    codeMirrorInstance,
    setSelected,
    kernelsData,
  });

  // gives syntax highlighting
  const cmLanguageObject = languageToSettings[language].language;
  // gives autocomplete from kernel
  const extraCompletions = cmLanguageObject
    ? cmLanguageObject.data.of({
        autocomplete: completionSource,
      })
    : [];

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
        className="cm-background"
        extensions={[
          EditorView.editable.of(isInNodeSelection),
          ...(projectSettings.code.codeBlockVimMode ? [vim()] : []),
          runCodeKeymap,
          ...(cmLanguageObject ? [extraCompletions] : []),
          ...(() => {
            const ext = languageToSettings[language].extension();
            return Array.isArray(ext) && ext.length === 0 ? [] : [ext];
          })(),
          autocompletion({
            activateOnTypingDelay: 50,
            // For languages that do not have a language object, there is now way to attach completions
            // to the language object, so we need to attach it to the autocompletion extension
            override: cmLanguageObject ? undefined : [completionSource],
          }),
          inspectTooltip,
        ]}
        theme={isDarkModeOn ? atomone : vscodeLight}
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
