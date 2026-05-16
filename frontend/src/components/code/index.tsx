import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { CodeMirrorRef } from './types';
import { EditorSelection } from '@codemirror/state';
import { $getRoot, $isElementNode, type LexicalNode } from 'lexical';
import { Loader } from '../../icons/loader';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { cn } from '../../utils/string-formatting';
import { CodeBlockStatus, Languages } from '../../types';
import { AnimatePresence, motion } from 'motion/react';
import { CodeActions } from './code-actions';
import { CodeResult } from './code-result';
import { languageDisplayConfig } from './language-config';
import { useNodeInNodeSelection } from '../../hooks/lexical';
import { SelectionHighlight } from '../selection-highlight';
import { Tooltip } from '../tooltip';

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

type CodeMirrorViewState = {
  ranges: Array<{ anchor: number; head: number }>;
  mainIndex: number;
  scrollTop: number;
  scrollLeft: number;
  shouldFocus: boolean;
};

function findCodeBlockOrder(nodeKey: string): number {
  let order = 0;
  let foundOrder = 0;

  function visit(node: LexicalNode): boolean {
    if (node.getType() === 'code') {
      if (node.getKey() === nodeKey) {
        foundOrder = order;
        return true;
      }
      order += 1;
      return false;
    }

    if (!$isElementNode(node)) return false;
    return node.getChildren().some(visit);
  }

  visit($getRoot());
  return foundOrder;
}

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
  setCode: (code: string) => void;
  status: CodeBlockStatus;
  setStatus: (status: CodeBlockStatus) => void;
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
  kernelInstanceId: string | null;
}) {
  const [codeMirrorInstance, setCodeMirrorInstance] =
    useState<CodeMirrorRef>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lexicalEditor] = useLexicalComposerContext();
  const [isSelected] = useLexicalNodeSelection(nodeKey);
  const isInNodeSelection = useNodeInNodeSelection(lexicalEditor, nodeKey);
  const [blockOrder, setBlockOrder] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingCodeMirrorViewStateRef = useRef<CodeMirrorViewState | null>(
    null
  );

  function captureCodeMirrorViewState({
    shouldFocus,
  }: {
    shouldFocus: boolean;
  }) {
    const view = codeMirrorInstance?.view;
    if (!view) return;

    pendingCodeMirrorViewStateRef.current = {
      ranges: view.state.selection.ranges.map((range) => ({
        anchor: range.anchor,
        head: range.head,
      })),
      mainIndex: view.state.selection.mainIndex,
      scrollTop: view.scrollDOM.scrollTop,
      scrollLeft: view.scrollDOM.scrollLeft,
      shouldFocus,
    };
  }

  function expandCodeBlock() {
    captureCodeMirrorViewState({ shouldFocus: true });
    setIsExpanded(true);
  }

  function collapseCodeBlock() {
    captureCodeMirrorViewState({ shouldFocus: true });
    setIsExpanded(false);
  }

  function restoreCodeMirrorViewState(instance: CodeMirrorRef): boolean {
    const pendingViewState = pendingCodeMirrorViewStateRef.current;
    const view = instance?.view;
    if (!pendingViewState || !view) return false;

    const docLength = view.state.doc.length;
    const clampPosition = (position: number) =>
      Math.min(Math.max(position, 0), docLength);
    const ranges = pendingViewState.ranges.map(({ anchor, head }) =>
      EditorSelection.range(clampPosition(anchor), clampPosition(head))
    );

    view.dispatch({
      selection: EditorSelection.create(
        ranges,
        Math.min(pendingViewState.mainIndex, ranges.length - 1)
      ),
    });

    pendingCodeMirrorViewStateRef.current = null;
    return true;
  }

  useEffect(() => {
    const updateBlockOrder = () => {
      lexicalEditor.getEditorState().read(() => {
        const nextOrder = findCodeBlockOrder(nodeKey);
        setBlockOrder((currentOrder) =>
          currentOrder === nextOrder ? currentOrder : nextOrder
        );
      });
    };

    updateBlockOrder();
    return lexicalEditor.registerUpdateListener(updateBlockOrder);
  }, [lexicalEditor, nodeKey]);

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
    expandCodeBlock,
    collapseCodeBlock,
    restoreCodeMirrorViewState,
    hideResults,
    setHideResults,
    dialogRef,
    isCreatedNow,
  };

  const identityProps = { id, nodeKey, language, blockOrder };
  const editorDocumentProps = { code, setCode };
  const executionProps = {
    status,
    setStatus,
    executionId,
    kernelInstanceId,
  };

  const executionMetadata = (
    <>
      <div>
        {executionCount > 0 &&
          `[${
            executionCount > MAX_EXECUTION_COUNT
              ? MAX_EXECUTION_COUNT
              : executionCount
          }]`}
      </div>
      <div>{durationText}</div>
    </>
  );

  const codeActions = (
    <CodeActions
      identity={identityProps}
      execution={executionProps}
      shell={shellProps}
      isSelected={isSelected}
    />
  );
  const languageDisplay = languageDisplayConfig[language];

  const languageIconTooltip = (
    <Tooltip
      content={languageDisplay.label}
      placement="top"
      root={isExpanded ? dialogRef : undefined}
    >
      <span className="w-fit" aria-label={languageDisplay.label}>
        {languageDisplay.icon}
      </span>
    </Tooltip>
  );

  const codeEditor = (
    <div
      className={cn('relative', isExpanded && 'flex flex-1 flex-col min-h-0 ')}
    >
      <CodeMirrorEditor
        identity={identityProps}
        editorDocument={editorDocumentProps}
        execution={executionProps}
        shell={shellProps}
      />
      {!isExpanded && (
        <div className="absolute inset-y-1 right-1 translate-x-16 space-y-1 text-zinc-400 w-12 flex flex-col justify-between">
          {languageIconTooltip}
          <motion.div
            layout="position"
            className="font-mono text-xs leading-tight"
            style={{ fontFamily: 'var(--code-block-font-family)' }}
          >
            {executionMetadata}
          </motion.div>
        </div>
      )}
    </div>
  );

  const codeResult = lastExecutedResult !== null && !hideResults && (
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
  );

  const codeContent = (
    <Suspense
      fallback={
        <Loader className="mx-auto my-3" height="1.125rem" width="1.125rem" />
      }
    >
      {codeActions}
      {codeEditor}
      {codeResult}
    </Suspense>
  );

  const expandedCodeContent = (
    <Suspense
      fallback={
        <Loader className="mx-auto my-3" height="1.125rem" width="1.125rem" />
      }
    >
      <div className="flex min-h-0 flex-1">
        <div className="relative flex min-w-0 flex-1 flex-col">
          {codeActions}
          {codeEditor}
        </div>
        <div className="flex justify-between w-12 shrink-0 flex-col items-center border-l border-l-zinc-200 pt-5 pb-3 text-zinc-400 dark:border-l-zinc-700">
          <div>{languageIconTooltip}</div>
          <div
            className="font-mono text-xs leading-tight text-center"
            style={{ fontFamily: 'var(--code-block-font-family)' }}
          >
            {executionMetadata}
          </div>
        </div>
      </div>
      {codeResult}
    </Suspense>
  );

  return (
    <div className="group flex gap-2 items-center relative">
      <dialog
        ref={dialogRef}
        id="code-dialog"
        data-drag-ghost-exclude
        className="backdrop:bg-zinc-500/65 dark:backdrop:bg-zinc-800/70 p-0 bg-transparent m-auto h-[calc(100vh-5rem)] w-[calc(100vw-5rem)] max-h-none max-w-none"
        onClose={() => {
          if (isExpanded) {
            collapseCodeBlock();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          collapseCodeBlock();
        }}
      >
        {isExpanded && (
          <span
            data-interactable="true"
            data-node-key={nodeKey}
            className={cn(
              'relative w-full h-full rounded-md border-2 cm-background border-zinc-150 dark:border-zinc-750 flex flex-col',
              isSelected && 'cm-background-selected border-(--accent-color)!'
            )}
          >
            {expandedCodeContent}
          </span>
        )}
      </dialog>
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
            isSelected && 'cm-background-selected border-(--accent-color)!'
          )}
        >
          {codeContent}
        </span>
      )}
    </div>
  );
}
