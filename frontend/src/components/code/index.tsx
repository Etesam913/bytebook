import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
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
  kernelInstanceId,
}: {
  id: string;
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  status: CodeBlockStatus;
  setStatus: Dispatch<SetStateAction<CodeBlockStatus>>;
  language: Languages;
  nodeKey: string;
  isCreatedNow: boolean;
  lastExecutedResult: string | null;
  setLastExecutedResult: Dispatch<SetStateAction<string>>;
  hideResults: boolean;
  setHideResults: Dispatch<SetStateAction<boolean>>;
  isWaitingForInput: boolean;
  setIsWaitingForInput: Dispatch<SetStateAction<boolean>>;
  executionCount: number;
  durationText: string;
  executionId: string;
  kernelInstanceId: string | null;
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

  const shellProps = {
    lexicalEditor,
    codeMirrorInstance,
    setCodeMirrorInstance,
    isExpanded,
    setIsExpanded,
    hideResults,
    setHideResults,
    dialogRef,
    isCreatedNow,
  };

  const identityProps = { id, nodeKey, language };
  const editorDocumentProps = { code, setCode };
  const executionProps = {
    status,
    setStatus,
    executionId,
    kernelInstanceId,
  };

  const codeContent = (
    <Suspense
      fallback={
        <Loader className="mx-auto my-3" height="1.125rem" width="1.125rem" />
      }
    >
      <CodeActions
        identity={identityProps}
        execution={executionProps}
        shell={shellProps}
        isSelected={isSelected}
      />
      <CodeMirrorEditor
        identity={identityProps}
        editorDocument={editorDocumentProps}
        execution={executionProps}
        shell={shellProps}
      />
      {lastExecutedResult !== null && !hideResults && (
        <CodeResult
          identity={identityProps}
          execution={executionProps}
          shell={shellProps}
          output={{
            lastExecutedResult,
            setLastExecutedResult,
            isWaitingForInput,
            setIsWaitingForInput,
          }}
        />
      )}
    </Suspense>
  );

  return (
    <div className="group flex gap-2 items-center relative">
      <dialog
        ref={dialogRef}
        id="code-dialog"
        className="backdrop:bg-zinc-500/65 dark:backdrop:bg-zinc-800/70 p-0 bg-transparent m-auto h-[calc(100vh-5rem)] w-[calc(100vw-5rem)] max-h-none max-w-none"
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
            'relative w-full h-full rounded-md border-2 cm-background border-zinc-150 dark:border-zinc-750 flex flex-col',
            isSelected && 'border-(--accent-color)!'
          )}
        >
          {codeContent}
        </span>
      </dialog>
      <div className="absolute -translate-x-10 font-mono text-xs text-zinc-400">
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
            'relative w-full rounded-md border-2 cm-background border-zinc-150 dark:border-zinc-750',
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
