import { useProjectSettingsQuery } from '@hooks/project-settings';
import { vscodeLight, vscodeDark } from '@uiw/codemirror-theme-vscode';
import { useAtomValue } from 'jotai/react';
import { isDarkModeOnAtom } from '@/atoms';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView, tooltips } from '@codemirror/view';
import { Prec, type Extension } from '@codemirror/state';
import { useDebouncedCallback } from '@hooks/debounce';
import { getCodemirrorKeymap } from '@utils/codemirror';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import type {
  CodeBlockDocumentProps,
  CodeBlockIdentityProps,
  CodeBlockShellProps,
} from './types';
import { cn } from '@utils/string-formatting';
import type { Languages } from '@/types';
import { useNodeInNodeSelection } from '@hooks/lexical';
import { useEffect, useState, type WheelEvent } from 'react';
import { languageDisplayConfig } from './language-config';
import type { BasicSetupOptions } from '@uiw/react-codemirror';
import {
  getLoadedLanguageExtension,
  loadLanguageExtension,
} from './language-extensions';

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

let vimExtensionPromise: Promise<Extension> | null = null;

function loadVimExtension(): Promise<Extension> {
  if (!vimExtensionPromise) {
    vimExtensionPromise = import('@replit/codemirror-vim').then((m) => m.vim());
  }
  return vimExtensionPromise;
}

export function CodeMirrorEditor({
  identity,
  editorDocument,
  shell,
}: {
  identity: CodeBlockIdentityProps;
  editorDocument: CodeBlockDocumentProps;
  shell: CodeBlockShellProps;
}) {
  const { nodeKey, language } = identity;
  const { code, setCode } = editorDocument;
  const {
    lexicalEditor,
    codeMirrorInstance,
    setCodeMirrorInstance,
    isExpanded,
    isCreatedNow,
    restoreCodeMirrorViewState,
  } = shell;
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);

  const debouncedSetCode = useDebouncedCallback(setCode, 300);
  // Keep the last keystrokes if the block unmounts mid-debounce (e.g. navigation)
  useEffect(() => {
    return () => debouncedSetCode.flush();
  }, [debouncedSetCode]);
  const {
    data: {
      code: {
        codeBlockVimMode,
        codeBlockLineWrapping,
        codeBlockShowLineNumbers,
      },
    },
  } = useProjectSettingsQuery();
  const [, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const isInNodeSelection = useNodeInNodeSelection(lexicalEditor, nodeKey);
  const [loadedLanguage, setLoadedLanguage] = useState<{
    language: Languages;
    extension: Extension;
  } | null>(() => {
    // If the grammar was already preloaded (e.g. by the markdown paste path),
    // seed state synchronously so the very first render of CodeMirror mounts
    // with the language extension already present — no later reconfigure
    // dispatch that can race with the lazy `@codemirror/lang-*` import.
    const preloaded = getLoadedLanguageExtension(language);
    return preloaded ? { language, extension: preloaded } : null;
  });
  const [vimExtension, setVimExtension] = useState<Extension | null>(null);

  useEffect(() => {
    if (loadedLanguage?.language === language) return;
    const promise = loadLanguageExtension(language);
    if (!promise) return;
    let cancelled = false;
    void promise.then((extension) => {
      if (!cancelled) setLoadedLanguage({ language, extension });
    });
    return () => {
      cancelled = true;
    };
  }, [language, loadedLanguage]);

  useEffect(() => {
    if (!codeBlockVimMode) return;
    let cancelled = false;
    void loadVimExtension().then((ext) => {
      if (!cancelled) setVimExtension(ext);
    });
    return () => {
      cancelled = true;
    };
  }, [codeBlockVimMode]);

  function handleEditorRef(instance: ReactCodeMirrorRef | null) {
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
      className={cn(
        'flex-1 py-2',
        isExpanded ? 'flex min-h-0 flex-col overflow-hidden' : 'min-h-12'
      )}
      onWheelCapture={handleEditorWheel}
    >
      <CodeMirror
        ref={handleEditorRef}
        value={code}
        onChange={debouncedSetCode}
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
          ...(codeBlockLineWrapping ? [EditorView.lineWrapping] : []),
          ...(codeBlockVimMode && vimExtension ? [vimExtension] : []),
          Prec.highest(
            EditorView.domEventHandlers({
              keydown(event) {
                if (event.key === 'Backspace' || event.key === 'Delete') {
                  // Keep Lexical from deleting the selected decorator node.
                  event.stopPropagation();
                }
                return false;
              },
            })
          ),
          runCodeKeymap,
          ...(loadedLanguage && loadedLanguage.language === language
            ? [loadedLanguage.extension]
            : []),
        ]}
        theme={isDarkModeOn ? vscodeDark : vscodeLight}
        onKeyDown={(e) => {
          // ArrowDown and ArrowUp are handled in the keybinding extension.
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') {
            setSelected(true);
          }
          e.stopPropagation();
        }}
        onClick={(e) => {
          clearSelection();
          setSelected(true);
          e.stopPropagation();
        }}
        basicSetup={{
          ...codeBlockBasicSetup,
          ...languageBasicSetup[language],
          lineNumbers: codeBlockShowLineNumbers,
        }}
      />
    </div>
  );
}
