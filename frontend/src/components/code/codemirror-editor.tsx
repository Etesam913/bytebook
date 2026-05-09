import { vscodeLight, vscodeDark } from '@uiw/codemirror-theme-vscode';
import { useAtomValue } from 'jotai/react';
import { isDarkModeOnAtom, projectSettingsAtom } from '../../atoms';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView, tooltips } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { debounce } from '../../utils/general';
import {
  useEnsureKernelMutation,
  useSendExecuteRequestMutation,
  useSendInterruptRequestMutation,
} from '../../hooks/code';
import { useDecodedNotesWildcardPath } from '../../hooks/routes';
import { useInspectTooltip } from '../../hooks/code-codemirror';
import { getCodemirrorKeymap } from '../../utils/codemirror';
import { focusEditor } from '.';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import type {
  CodeBlockDocumentProps,
  CodeBlockExecutionProps,
  CodeBlockIdentityProps,
  CodeBlockShellProps,
} from './types';
import { cn } from '../../utils/string-formatting';
import type { Languages } from '../../types';
import { useNodeInNodeSelection } from '../../hooks/lexical';
import { useEffect, useRef, useState, type WheelEvent } from 'react';
import { languageDisplayConfig } from './language-config';
import type { BasicSetupOptions } from '@uiw/react-codemirror';

const codeBlockBasicSetup: BasicSetupOptions = {
  lineNumbers: false,
  foldGutter: false,
  autocompletion: false,
  completionKeymap: false,
};

const languageBasicSetup: Record<Languages, BasicSetupOptions> = {
  python: { tabSize: languageDisplayConfig.python.tabSize },
  go: { tabSize: languageDisplayConfig.go.tabSize },
  javascript: { tabSize: languageDisplayConfig.javascript.tabSize },
  java: { tabSize: languageDisplayConfig.java.tabSize },
  text: { tabSize: languageDisplayConfig.text.tabSize },
};

// Lazy-loaded language extensions. Each grammar lives in its own chunk
// (chunk-lang-*.js) so unused languages aren't shipped on initial load.
const languageLoaders: Record<Languages, (() => Promise<Extension>) | null> = {
  python: () => import('@codemirror/lang-python').then((m) => m.python()),
  go: () => import('@codemirror/lang-go').then((m) => m.go()),
  javascript: () =>
    import('@codemirror/lang-javascript').then((m) => m.javascript()),
  java: () => import('@codemirror/lang-java').then((m) => m.java()),
  text: null,
};

const languageExtensionCache = new Map<Languages, Promise<Extension>>();

function loadLanguageExtension(language: Languages): Promise<Extension> | null {
  const loader = languageLoaders[language];
  if (!loader) return null;
  let cached = languageExtensionCache.get(language);
  if (!cached) {
    cached = loader();
    languageExtensionCache.set(language, cached);
  }
  return cached;
}

let vimExtensionPromise: Promise<Extension> | null = null;

function loadVimExtension(): Promise<Extension> {
  if (!vimExtensionPromise) {
    vimExtensionPromise = import('@replit/codemirror-vim').then((m) => m.vim());
  }
  return vimExtensionPromise;
}

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
    restoreCodeMirrorViewState,
  } = shell;
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const noteId = useDecodedNotesWildcardPath() ?? '';

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

  const [loadedLanguage, setLoadedLanguage] = useState<{
    language: Languages;
    extension: Extension;
  } | null>(null);
  const [vimExtension, setVimExtension] = useState<Extension | null>(null);

  useEffect(() => {
    const promise = loadLanguageExtension(language);
    if (!promise) return;
    let cancelled = false;
    void promise.then((extension) => {
      if (!cancelled) setLoadedLanguage({ language, extension });
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    if (!projectSettings.code.codeBlockVimMode) return;
    let cancelled = false;
    void loadVimExtension().then((ext) => {
      if (!cancelled) setVimExtension(ext);
    });
    return () => {
      cancelled = true;
    };
  }, [projectSettings.code.codeBlockVimMode]);

  function handleEditorRef(instance: ReactCodeMirrorRef | null) {
    internalCodeMirrorRef.current = instance;
    setCodeMirrorInstance(instance);
    const didRestoreViewState = restoreCodeMirrorViewState(instance);
    if (instance?.view && isCreatedNow && !didRestoreViewState) {
      instance.view.focus();
    }
  }

  useEffect(() => {
    if (codeMirrorInstance?.view && isInNodeSelection) {
      codeMirrorInstance.view.focus();
    }
  }, [codeMirrorInstance, isInNodeSelection]);

  /**
   * Previously, the codemirror scroller would be inconsistent and get stuck
   * This fixes it
   */
  function handleEditorWheel(event: WheelEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    const scroller = target?.closest('.cm-scroller');
    if (!(scroller instanceof HTMLElement)) return;

    const canScrollUp = scroller.scrollTop > 0;
    const canScrollDown =
      scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight;
    const isScrollingWithinCode =
      (event.deltaY < 0 && canScrollUp) || (event.deltaY > 0 && canScrollDown);

    if (isScrollingWithinCode) {
      event.stopPropagation();
    }
  }

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
        'flex-1 py-2',
        isExpanded ? 'flex min-h-0 flex-col overflow-hidden' : 'min-h-12'
      )}
      onWheelCapture={handleEditorWheel}
    >
      <CodeMirror
        ref={handleEditorRef}
        value={code}
        onChange={(newCode) => {
          debouncedSetCode(newCode);
        }}
        className={cn(
          'cm-background',
          isExpanded ? 'cm-background-expanded' : 'cm-background-collapsed'
        )}
        extensions={[
          tooltips({
            parent: document.body,
          }),
          // tooltips({
          //   parent: document.getElementById('code-dialog') ?? document.body,
          // }),
          EditorView.editable.of(isInNodeSelection),
          ...(projectSettings.code.codeBlockVimMode && vimExtension
            ? [vimExtension]
            : []),
          runCodeKeymap,
          ...(loadedLanguage && loadedLanguage.language === language
            ? [loadedLanguage.extension]
            : []),
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
          ...languageBasicSetup[language],
        }}
      />
    </div>
  );
}
