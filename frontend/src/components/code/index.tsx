import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { CodeMirrorRef } from './types';
import { Loader } from '../../icons/loader';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { cn } from '../../utils/string-formatting';
import { CodeBlockStatus, Languages } from '../../types';
import { AnimatePresence, motion } from 'motion/react';
import { CodeActions } from './code-actions';
import { CodeResult } from './code-result';
import { trapFocusContainerAtom } from '../../atoms';
import { useSetAtom } from 'jotai';
import { languageDisplayConfig } from './language-config';

const CodeMirrorEditor = lazy(() =>
  import('./codemirror-editor').then((module) => ({
    default: module.CodeMirrorEditor,
  }))
);

export const focusEditor = (codeMirrorInstance: CodeMirrorRef) => {
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
  durationText,
  executionId,
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
  durationText: string;
  executionId: string;
}) {
  const [codeMirrorInstance, setCodeMirrorInstance] =
    useState<CodeMirrorRef>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lexicalEditor] = useLexicalComposerContext();
  const [isSelected] = useLexicalNodeSelection(nodeKey);
  const setTrapFocusContainer = useSetAtom(trapFocusContainerAtom);
  const codeBlockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
      if (isSelected) {
        setTrapFocusContainer(codeBlockRef.current);
      } else {
        setTrapFocusContainer(null);
      }
    }
  }, [isSelected, isExpanded]);

  return (
    <div className="flex gap-2 items-center relative" ref={codeBlockRef}>
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
      <div className="absolute -translate-x-10 font-code text-xs text-zinc-400">
        <div>
          {executionCount > 0 &&
            `[${
              executionCount > MAX_EXECUTION_COUNT
                ? MAX_EXECUTION_COUNT
                : executionCount
            }]`}
        </div>
        <div>{durationText}</div>
      </div>
      <span
        data-interactable="true"
        data-node-key={nodeKey}
        className={cn(
          'relative rounded-md border-[2px] overflow-hidden grow cm-background transition-colors border-zinc-150 dark:border-zinc-700',
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
            executionId={executionId}
          />
          {lastExecutedResult !== null && (
            <CodeResult
              id={id}
              language={language}
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

      <div className="translate-x-[24px] absolute text-zinc-400 right-1">
        {languageDisplayConfig[language].icon}
      </div>
    </div>
  );
}
