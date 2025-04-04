import { JSX, lazy, Suspense, useEffect, useState } from 'react';
import { langs } from '@uiw/codemirror-extensions-langs';
import type { LanguageSupport, StreamLanguage } from '@codemirror/language';
import { BasicSetupOptions, ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { PythonLogo } from '../../icons/python-logo';
import { MotionIconButton } from '../buttons';
import { Duplicate2 } from '../../icons/duplicate-2';
import { getDefaultButtonVariants } from '../../animations';
import { useAtomValue } from 'jotai/react';
import { kernelsDataAtom } from '../../atoms';
import { Trash } from '../../icons/trash';
import { Loader } from '../../icons/loader';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { removeDecoratorNode } from '../../utils/commands';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { cn } from '../../utils/string-formatting';
import { GolangLogo } from '../../icons/golang-logo';
import { PlayButton } from './play-button';
import { CollapseButton } from './collapse-button';
import { CodeResult } from './code-result';
import { Fullscreen } from '../../icons/fullscreen';
import { Languages } from '../../types';

const CodeMirrorEditor = lazy(() =>
  import('./codemirror-editor').then((module) => ({
    default: module.CodeMirrorEditor,
  }))
);

type LanguageSetting = {
  basicSetup?: BasicSetupOptions;
  extension: () => LanguageSupport | StreamLanguage<unknown>;
  icon: JSX.Element;
};

export const languageToSettings: Record<Languages, LanguageSetting> = {
  python: {
    basicSetup: { tabSize: 4 },
    extension: langs.python,
    icon: <PythonLogo width={16} height={16} />,
  },
  go: {
    basicSetup: { tabSize: 4 },
    extension: langs.go,
    icon: <GolangLogo width={16} height={16} />,
  },
};

export const focusEditor = (codeMirrorInstance: ReactCodeMirrorRef | null) => {
  if (codeMirrorInstance?.view) {
    codeMirrorInstance.view.focus();
  }
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [lexicalEditor] = useLexicalComposerContext();
  const [isSelected] = useLexicalNodeSelection(nodeKey);
  const kernelsData = useAtomValue(kernelsDataAtom);
  const { status } = kernelsData[language];

  useEffect(() => {
    if (isSelected) {
      focusEditor(codeMirrorInstance);
    }
  }, [isSelected]);

  return (
    <div
      className={cn(
        'flex border-2 bg-white dark:bg-[#2e3440] transition-colors border-zinc-200 dark:border-zinc-700 rounded-md',
        isSelected && !isExpanded && '!border-(--accent-color)',
        isExpanded &&
          'fixed left-0 top-0 right-0 bottom-0 h-screen w-screen z-[60] !border-0'
      )}
    >
      <div
        className={cn(
          'flex flex-col w-10 items-center justify-between gap-2 border-r-1 px-1 pt-1.5 pb-1 border-zinc-200 dark:border-zinc-700',
          isCollapsed && 'pt-2'
        )}
      >
        {!isExpanded && (
          <CollapseButton
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
          />
        )}
        {!isCollapsed && (
          <div className="mt-auto flex flex-col gap-2">
            {(status === 'busy' || status === 'starting') && (
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
            isCollapsed && 'border-b-0',
            isExpanded && 'py-3 pl-11'
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
            {/* <p>{language}</p> */}
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
              <Duplicate2 height={18} width={18} />
            </MotionIconButton>
            <MotionIconButton
              {...getDefaultButtonVariants()}
              onClick={() => {
                if (isCollapsed) {
                  setIsCollapsed(false);
                }
                setIsExpanded(!isExpanded);
              }}
            >
              <Fullscreen />
            </MotionIconButton>
            <MotionIconButton
              {...getDefaultButtonVariants()}
              onClick={() => {
                lexicalEditor.update(() => {
                  removeDecoratorNode(nodeKey);
                });
              }}
            >
              <Trash height={18} width={18} />
            </MotionIconButton>
          </span>
        </header>

        <Suspense
          fallback={<Loader className="mx-auto mt-3" height={18} width={18} />}
        >
          {!isCollapsed && (
            <CodeMirrorEditor
              nodeKey={nodeKey}
              lexicalEditor={lexicalEditor}
              codeMirrorInstance={codeMirrorInstance}
              setCodeMirrorInstance={setCodeMirrorInstance}
              code={code}
              setCode={setCode}
              id={id}
              language={language}
              isCreatedNow={isCreatedNow}
              isExpanded={isExpanded}
              lastExecutedResult={lastExecutedResult}
            />
          )}
        </Suspense>
        {lastExecutedResult && !isCollapsed && (
          <CodeResult lastExecutedResult={lastExecutedResult} />
        )}
      </div>
    </div>
  );
}
