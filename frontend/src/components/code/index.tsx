import { JSX, Suspense, lazy, useEffect, useState } from 'react';
import { langs } from '@uiw/codemirror-extensions-langs';
import type { LanguageSupport, StreamLanguage } from '@codemirror/language';
import { nord } from '@uiw/codemirror-theme-nord';
import {
  BasicSetupOptions,
  Prec,
  ReactCodeMirrorRef,
  keymap,
} from '@uiw/react-codemirror';
import { PythonLogo } from '../../icons/python-logo';
import { MotionIconButton } from '../buttons';
import { Duplicate2 } from '../../icons/duplicate-2';
import { getDefaultButtonVariants } from '../../animations';
import { useAtomValue } from 'jotai/react';
import { isDarkModeOnAtom, pythonKernelStatusAtom } from '../../atoms';
import { vscodeLight } from '@uiw/codemirror-theme-vscode';
import { Trash } from '../../icons/trash';
import { Loader } from '../../icons/loader';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { removeDecoratorNode } from '../../utils/commands';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { cn } from '../../utils/string-formatting';
import { Languages } from '../editor/nodes/code';
import { GolangLogo } from '../../icons/golang-logo';
import { ChevronDown } from '../../icons/chevron-down';
import { motion } from 'framer-motion';
import { PlayButton } from './play-button';
import { debounce } from '../../utils/general';
import { runCode } from '../../utils/code';
import { useSendExecuteRequestMutation } from '../../hooks/code';

const CodeMirror = lazy(() => import('@uiw/react-codemirror'));

type LanguageSetting = {
  basicSetup?: BasicSetupOptions;
  extension: () => LanguageSupport | StreamLanguage<unknown>;
  icon: JSX.Element;
};

const languageToSettings: Record<Languages, LanguageSetting> = {
  python: {
    basicSetup: { tabSize: 4 },
    extension: langs.python,
    icon: <PythonLogo width={14} height={14} />,
  },
  go: {
    basicSetup: { tabSize: 4 },
    extension: langs.go,
    icon: <GolangLogo width={16} height={16} />,
  },
};

export function Code({
  id,
  code,
  setCode,
  language,
  nodeKey,
  isCreatedNow,
  isCollapsed,
  setIsCollapsed,
  lastExecutedResult,
}: {
  id: string;
  code: string;
  setCode: (newCode: string) => void;
  language: Languages;
  nodeKey: string;
  isCreatedNow: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (newIsCollapsed: boolean) => void;
  lastExecutedResult: string | null;
}) {
  const [codeMirrorInstance, setCodeMirrorInstance] =
    useState<ReactCodeMirrorRef | null>(null);

  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const [lexicalEditor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);

  const pythonKernelStatus = useAtomValue(pythonKernelStatusAtom);
  const { mutate: executeCode } = useSendExecuteRequestMutation(id, language);

  function handleEditorRef(instance: ReactCodeMirrorRef | null) {
    setCodeMirrorInstance(instance);
    if (instance?.view && isCreatedNow) {
      instance.view.focus();
    }
  }

  const focusEditor = () => {
    if (codeMirrorInstance?.view) {
      codeMirrorInstance.view.focus();
    }
  };

  useEffect(() => {
    if (isSelected) {
      focusEditor();
    }
  }, [isSelected]);

  const debouncedSetCode = debounce(setCode, 300);

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

  return (
    <div
      className={cn(
        'flex overflow-hidden border-2 dark:bg-[#2e3440] transition-colors border-zinc-200 dark:border-zinc-700 rounded-md',
        isSelected && '!border-(--accent-color)'
      )}
    >
      <div
        className={cn(
          'flex flex-col w-10 items-center justify-between gap-2 border-r-1 px-1 pt-1.5 pb-1 border-zinc-200 dark:border-zinc-700',
          isCollapsed && 'pt-2'
        )}
      >
        <MotionIconButton
          onClick={() => setIsCollapsed(!isCollapsed)}
          {...getDefaultButtonVariants()}
        >
          <motion.div
            initial={{ rotateZ: !isCollapsed ? 180 : 0 }}
            animate={{ rotateZ: !isCollapsed ? 180 : 0 }}
          >
            <ChevronDown
              className="will-change-transform"
              strokeWidth="2.5px"
            />
          </motion.div>
        </MotionIconButton>
        {!isCollapsed && (
          <div className="mt-auto flex flex-col gap-2">
            {(pythonKernelStatus === 'busy' ||
              pythonKernelStatus === 'starting') && (
              <Loader className="mx-auto" height={18} width={18} />
            )}
            <PlayButton
              codeBlockId={id}
              codeMirrorInstance={codeMirrorInstance}
              language={language}
            />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-x-auto">
        <header
          className={cn(
            'flex justify-between gap-1.5 font-code text-xs px-2 py-1 border-b-1 border-b-zinc-200 dark:border-b-zinc-700',
            isCollapsed && 'border-b-0'
          )}
        >
          <span className="flex items-center gap-1.5">
            {isCollapsed && (
              <PlayButton
                codeBlockId={id}
                codeMirrorInstance={codeMirrorInstance}
                language={language}
              />
            )}
            {languageToSettings[language].icon}
            <p>{language}</p>
          </span>
          <span className="flex items-center gap-1">
            <MotionIconButton
              {...getDefaultButtonVariants()}
              onClick={() => {
                if (!codeMirrorInstance) return;
                const editorContent =
                  codeMirrorInstance.view?.state.doc.toString();
                if (!editorContent) return;
                navigator.clipboard.writeText(editorContent);
              }}
            >
              <Duplicate2 height={16} width={16} />
            </MotionIconButton>
            <MotionIconButton
              {...getDefaultButtonVariants()}
              onClick={() => {
                lexicalEditor.update(() => {
                  removeDecoratorNode(nodeKey);
                });
              }}
            >
              <Trash height={16} width={16} />
            </MotionIconButton>
          </span>
        </header>

        <Suspense
          fallback={<Loader className="mx-auto mt-3" height={18} width={18} />}
        >
          {!isCollapsed && (
            <CodeMirror
              ref={handleEditorRef}
              value={code}
              onChange={(newCode) => {
                debouncedSetCode(newCode);
              }}
              extensions={[
                runCodeKeymap,
                languageToSettings[language].extension(),
              ]}
              theme={isDarkModeOn ? nord : vscodeLight}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  document.getElementById('content-editable-editor')?.focus();
                } else if (e.key === 'Backspace') {
                  // Fixes weird bug where pressing backspace at beginning of first line focuses the <body> tag
                  setTimeout(() => {
                    focusEditor();
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
          )}
        </Suspense>
        {lastExecutedResult && (
          <footer
            dangerouslySetInnerHTML={{ __html: lastExecutedResult }}
            className="flex flex-col justify-between gap-1.5 font-code text-xs pl-1 pr-2 py-1.5 border-t-1 border-t-zinc-200 dark:border-t-zinc-700"
          />
        )}
      </div>
    </div>
  );
}
