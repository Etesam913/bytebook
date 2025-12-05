import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { CodeMirrorRef } from './types';
import { Loader } from '../../icons/loader';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { cn } from '../../utils/string-formatting';
import { CodeBlockStatus, Languages } from '../../types';
import { AnimatePresence } from 'motion/react';
import { CodeActions } from './code-actions';
import { CodeResult } from './code-result';
import { languageDisplayConfig } from './language-config';
import { useNodeInNodeSelection } from '../../hooks/lexical';
import { SelectionHighlight } from '../selection-highlight';

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
  hideResults,
  setHideResults,
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
  hideResults: boolean;
  setHideResults: (hideResults: boolean) => void;
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
  const isInNodeSelection = useNodeInNodeSelection(lexicalEditor, nodeKey);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isExpanded) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isExpanded]);

  const codeContent = (
    <Suspense
      fallback={<Loader className="mx-auto my-3" height={18} width={18} />}
    >
      <CodeActions
        editor={lexicalEditor}
        codeMirrorInstance={codeMirrorInstance}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        hideResults={hideResults}
        setHideResults={setHideResults}
        language={language}
        nodeKey={nodeKey}
        dialogRef={dialogRef}
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
        hideResults={hideResults}
        dialogRef={dialogRef}
      />
      {lastExecutedResult !== null && !hideResults && (
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
  );

  return (
    <div className="flex gap-2 items-center relative">
      <dialog
        ref={dialogRef}
        className="backdrop:bg-zinc-200/65 dark:backdrop:bg-zinc-800/65 bg-transparent p-0 m-auto h-[calc(100vh-5rem)] w-[calc(100vw-5rem)] max-h-none max-w-none"
        onClose={() => {
          setIsExpanded(false);
          focusEditor(codeMirrorInstance);
        }}
        onCancel={() => {
          setIsExpanded(false);
          focusEditor(codeMirrorInstance);
        }}
      >
        <span
          data-interactable="true"
          data-node-key={nodeKey}
          className={cn(
            'relative w-full h-full rounded-md border-2 cm-background transition-colors border-zinc-150 dark:border-zinc-750 flex flex-col',
            isSelected && 'border-(--accent-color)!'
          )}
        >
          {codeContent}
        </span>
      </dialog>
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
      <AnimatePresence>
        {isSelected && !isInNodeSelection && (
          <SelectionHighlight
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          />
        )}
      </AnimatePresence>
      {!isExpanded && (
        <span
          data-interactable="true"
          data-node-key={nodeKey}
          className={cn(
            'relative w-full rounded-md border-2 grow cm-background transition-colors border-zinc-150 dark:border-zinc-750',
            isSelected && 'border-(--accent-color)!'
          )}
        >
          {codeContent}
        </span>
      )}

      <div className="translate-x-[24px] absolute text-zinc-400 right-1">
        {languageDisplayConfig[language].icon}
      </div>
    </div>
  );
}
