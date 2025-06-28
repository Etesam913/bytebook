import { JSX, lazy, Suspense, useState } from 'react';
import { langs } from '@uiw/codemirror-extensions-langs';
import type { LanguageSupport, StreamLanguage } from '@codemirror/language';
import { BasicSetupOptions, ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { PythonLogo } from '../../icons/python-logo';
import { Loader } from '../../icons/loader';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { cn } from '../../utils/string-formatting';
import { GolangLogo } from '../../icons/golang-logo';
import { CodeBlockStatus, Languages } from '../../types';
import { AnimatePresence, motion } from 'motion/react';
import { CodeActions } from './code-actions';
import { CodeResult } from './code-result';

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

const MAX_EXECUTION_COUNT = 999;

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
  isWaitingForInput,
  setIsWaitingForInput,
  executionCount,
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
  setLastExecutedResult: (lastExecutedResult: string) => void;
  isWaitingForInput: boolean;
  setIsWaitingForInput: (isWaitingForInput: boolean) => void;
  executionCount: number;
}) {
  const [codeMirrorInstance, setCodeMirrorInstance] =
    useState<ReactCodeMirrorRef | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lexicalEditor] = useLexicalComposerContext();
  const [isSelected] = useLexicalNodeSelection(nodeKey);

  // Calculate translate-x based on execution count digits
  const getTranslateValue = (count: number) => {
    const digits = count.toString().length;
    // Base translation for brackets + 1 digit, then add more for each additional digit
    const baseTranslation = 32; // ~8 * 0.25rem (32px for [1])
    const additionalTranslation = digits > 1 ? (digits - 1) * 6 : 0; // ~1.5 * 0.25rem per additional digit
    return -(baseTranslation + additionalTranslation * 0.71);
  };

  return (
    <div className="flex items-center gap-2 relative">
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
      <span
        className="absolute z-20 text-xs text-zinc-400 font-code"
        style={{
          transform: `translateX(${getTranslateValue(executionCount)}px)`,
        }}
      >
        {executionCount > 0 &&
          `[${
            executionCount > MAX_EXECUTION_COUNT
              ? MAX_EXECUTION_COUNT
              : executionCount
          }]`}
      </span>
      <span
        data-interactable="true"
        data-node-key={nodeKey}
        className={cn(
          'relative rounded-md border-[2px] overflow-hidden grow bg-white dark:bg-[#2e3440] transition-colors border-zinc-150 dark:border-zinc-700',
          isSelected && '!border-(--accent-color)',
          isExpanded &&
            'fixed z-[60] left-0 top-0 right-0 bottom-0 h-[calc(100vh-5rem)] m-auto w-[calc(100vw-5rem)] flex flex-col'
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
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
            nodeKey={nodeKey}
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
            status={status}
            setStatus={setStatus}
          />
          {lastExecutedResult !== null && (
            <CodeResult
              id={id}
              lastExecutedResult={lastExecutedResult}
              setLastExecutedResult={setLastExecutedResult}
              isExpanded={isExpanded}
              status={status}
              isWaitingForInput={isWaitingForInput}
              setIsWaitingForInput={setIsWaitingForInput}
              codeMirrorInstance={codeMirrorInstance}
            />
          )}
        </Suspense>
      </span>
    </div>
  );
}
