import { vscodeLight, vscodeDark } from '@uiw/codemirror-theme-vscode';
import { useAtomValue } from 'jotai/react';
import { isDarkModeOnAtom, projectSettingsAtom } from '../../atoms';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView, tooltips } from '@codemirror/view';
import { debounce } from '../../utils/general';
import {
  useEnsureKernelMutation,
  useSendExecuteRequestMutation,
  useSendInterruptRequestMutation,
} from '../../hooks/code';
import { useCurrentNoteId } from '../../hooks/routes';
import { useInspectTooltip } from '../../hooks/code-codemirror';
import { getCodemirrorKeymap } from '../../utils/codemirror';
import { focusEditor } from '.';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { vim } from '@replit/codemirror-vim';
import type {
  CodeBlockDocumentProps,
  CodeBlockExecutionProps,
  CodeBlockIdentityProps,
  CodeBlockShellProps,
} from './types';
import { cn } from '../../utils/string-formatting';
import type { Languages } from '../../types';
import { useNodeInNodeSelection } from '../../hooks/lexical';
import { useEffect, useRef } from 'react';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { go } from '@codemirror/lang-go';
import { languageDisplayConfig } from './language-config';
import type { BasicSetupOptions } from '@uiw/react-codemirror';

type LanguageSetting = {
  basicSetup?: BasicSetupOptions;
  extension: () => unknown;
};

const codeBlockBasicSetup: BasicSetupOptions = {
  lineNumbers: false,
  foldGutter: false,
  autocompletion: false,
  completionKeymap: false,
};

const languageToSettings: Record<Languages, LanguageSetting> = {
  python: {
    basicSetup: { tabSize: languageDisplayConfig.python.tabSize },
    extension: python,
  },
  go: {
    basicSetup: { tabSize: languageDisplayConfig.go.tabSize },
    extension: go,
  },
  javascript: {
    basicSetup: { tabSize: languageDisplayConfig.javascript.tabSize },
    extension: javascript,
  },
  java: {
    basicSetup: { tabSize: languageDisplayConfig.java.tabSize },
    extension: java,
  },
  text: {
    basicSetup: { tabSize: languageDisplayConfig.text.tabSize },
    extension: () => [],
  },
};

// Map to store pending inspection promises by messageId
const pendingInspections = new Map<
  string,
  (data: { found: boolean; messageId: string; message: string }) => void
>();

export function CodeMirrorEditor({
  identity,
  editorDocument,
  execution,
  shell,
}: {
  identity: CodeBlockIdentityProps;
  editorDocument: CodeBlockDocumentProps;
  execution: CodeBlockExecutionProps;
  shell: CodeBlockShellProps;
}) {
  const { id, nodeKey, language } = identity;
  const { code, setCode } = editorDocument;
  const { status, setStatus, executionId, kernelInstanceId } = execution;
  const {
    lexicalEditor,
    codeMirrorInstance,
    setCodeMirrorInstance,
    isExpanded,
    hideResults,
    isCreatedNow,
  } = shell;
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const noteId = useCurrentNoteId();

  const { mutate: executeCode } = useSendExecuteRequestMutation({
    noteId,
    codeBlockId: id,
    language,
    setStatus,
    editor: lexicalEditor,
  });

  const { mutate: interruptExecution } = useSendInterruptRequestMutation();

  const { mutate: ensureKernel } = useEnsureKernelMutation();

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
  const internalCodeMirrorRef = useRef<ReactCodeMirrorRef | null>(null);

  function handleEditorRef(instance: ReactCodeMirrorRef | null) {
    internalCodeMirrorRef.current = instance;
    setCodeMirrorInstance(instance);
    if (instance?.view && isCreatedNow) {
      instance.view.focus();
    }
  }

  // Re-sync codeMirrorInstance when isExpanded changes.
  // This fixes an issue where, when not expanded, both the dialog and the main span
  // render their own CodeMirrorEditor instances that share the same codeMirrorInstance state.
  // When the span unmounts (on expand), it sets codeMirrorInstance to null, breaking the dialog's play button.
  // This effect ensures the dialog's instance re-registers itself after the span unmounts.
  useEffect(() => {
    if (isExpanded && internalCodeMirrorRef.current) {
      setCodeMirrorInstance(internalCodeMirrorRef.current);
    }
  }, [isExpanded, setCodeMirrorInstance]);

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
    noteId,
    language,
    kernelInstanceId,
    executeCode,
    interruptExecution,
    ensureKernel,
    codeMirrorInstance,
    setSelected,
    isExecutionEnabled: !hideResults && language !== 'text',
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
      className={cn(
        'min-h-12 flex-1 overflow-auto h-full py-2',
        !isExpanded && 'max-h-[500px]'
      )}
    >
      <CodeMirror
        ref={handleEditorRef}
        value={code}
        onChange={(newCode) => {
          debouncedSetCode(newCode);
        }}
        className="cm-background"
        extensions={[
          tooltips({
            parent: document.body,
          }),
          // tooltips({
          //   parent: document.getElementById('code-dialog') ?? document.body,
          // }),
          EditorView.editable.of(isInNodeSelection),
          ...(projectSettings.code.codeBlockVimMode ? [vim()] : []),
          runCodeKeymap,
          ...(() => {
            const ext = languageToSettings[language].extension();
            return Array.isArray(ext) && ext.length === 0 ? [] : [ext as never];
          })(),
          inspectTooltip,
        ]}
        theme={isDarkModeOn ? vscodeDark : vscodeLight}
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
          ...codeBlockBasicSetup,
          ...languageToSettings[language].basicSetup,
        }}
      />
    </div>
  );
}
