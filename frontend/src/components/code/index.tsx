import { JSX, lazy, Suspense, useEffect, useState } from 'react';
import { langs } from '@uiw/codemirror-extensions-langs';
import type { LanguageSupport, StreamLanguage } from '@codemirror/language';
import { BasicSetupOptions, ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { PythonLogo } from '../../icons/python-logo';
import { MotionIconButton } from '../buttons';
import { Duplicate2 } from '../../icons/duplicate-2';
import { getDefaultButtonVariants } from '../../animations';
import { Trash } from '../../icons/trash';
import { Loader } from '../../icons/loader';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { removeDecoratorNode } from '../../utils/commands';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { cn } from '../../utils/string-formatting';
import { GolangLogo } from '../../icons/golang-logo';
import { PlayButton } from './play-button';
import { CodeResult } from './code-result';
import { Maximize } from '../../icons/maximize';
import { CodeBlockStatus, Languages } from '../../types';
import { AnimatePresence, motion } from 'motion/react';
import { CodeActions } from './code-actions';

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
  status,
  setStatus,
  language,
  nodeKey,
  isCreatedNow,
  lastExecutedResult,
  setLastExecutedResult,
}: {
  id: string;
  code: string;
  setCode: (newCode: string) => void;
  status: CodeBlockStatus;
  setStatus: (newStatus: CodeBlockStatus) => void;
  language: Languages;
  nodeKey: string;
  isCreatedNow: boolean;
  lastExecutedResult: string | null;
  setLastExecutedResult: (result: string | null) => void;
}) {
  const [codeMirrorInstance, setCodeMirrorInstance] =
    useState<ReactCodeMirrorRef | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lexicalEditor] = useLexicalComposerContext();
  const [isSelected] = useLexicalNodeSelection(nodeKey);

  useEffect(() => {
    if (isSelected || isExpanded) {
      focusEditor(codeMirrorInstance);
    }
  }, [isSelected, isExpanded]);

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-50 left-0 top-0 right-0 bottom-0 h-screen w-screen bg-zinc-200/65 dark:bg-zinc-800/65"
          />
        )}
      </AnimatePresence>
      <motion.div
        layout
        className={cn(
          'relative outline-[2px] overflow-hidden bg-white dark:bg-[#2e3440] transition-colors outline-zinc-150 dark:outline-zinc-700 rounded-md',
          isSelected && '!outline-(--accent-color)',
          isExpanded &&
            'fixed z-[60] left-0 top-0 right-0 bottom-0 h-[calc(100vh-5rem)] m-auto w-[calc(100vw-5rem)]'
        )}
      >
        <Suspense
          fallback={<Loader className="mx-auto my-3" height={18} width={18} />}
        >
          <CodeActions
            id={id}
            codeMirrorInstance={codeMirrorInstance}
            language={language}
            status={status}
            setStatus={setStatus}
            setLastExecutedResult={setLastExecutedResult}
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
            nodeKey={nodeKey}
            lexicalEditor={lexicalEditor}
          />
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
            setStatus={setStatus}
            lastExecutedResult={lastExecutedResult}
            setLastExecutedResult={setLastExecutedResult}
          />
        </Suspense>
        {lastExecutedResult !== null && (
          <CodeResult
            lastExecutedResult={lastExecutedResult}
            isExpanded={isExpanded}
            status={status}
          />
        )}
      </motion.div>
    </>
  );
}
