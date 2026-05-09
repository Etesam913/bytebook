import { useEffect, useRef, useState } from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { MotionIconButton } from '../buttons';
import { Duplicate2 } from '../../icons/duplicate-2';
import { motion } from 'motion/react';
import { cn } from '../../utils/string-formatting';
import { useSendInputReplyMutation } from '../../hooks/code';
import type { CodeBlockResultProps } from './types';

const RUNNING_STATUS_TEXT = 'Running';
const RUNNING_STATUS_CHARACTER_DELAY_SECONDS = 0.08;
const RUNNING_STATUS_ANIMATION_DURATION_SECONDS = 0.7;
const RUNNING_STATUS_ANIMATION_REPEAT_DELAY_SECONDS = 0.55;
const RUNNING_STATUS_DELAY_MS = 1500;

function RunningStatus({
  isRunning,
  runId,
  onVisible,
}: {
  isRunning: boolean;
  runId: string;
  onVisible: (runId: string) => void;
}) {
  const [visibleRunId, setVisibleRunId] = useState<string | null>(null);
  const isVisible = isRunning && visibleRunId === runId;

  useEffect(() => {
    if (!isRunning) return;

    const timeoutId = window.setTimeout(() => {
      setVisibleRunId(runId);
      onVisible(runId);
    }, RUNNING_STATUS_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isRunning, onVisible, runId]);

  return (
    <>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="px-2 pb-1 pt-2 font-mono text-xs italic text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5"
          style={{ fontFamily: 'var(--code-block-font-family)' }}
        >
          <span>
            {Array.from(RUNNING_STATUS_TEXT).map((character, index) => (
              <motion.span
                aria-hidden="true"
                key={`${character}-${index}`}
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{
                  delay: index * RUNNING_STATUS_CHARACTER_DELAY_SECONDS,
                  duration: RUNNING_STATUS_ANIMATION_DURATION_SECONDS,
                  repeat: Infinity,
                  repeatDelay: RUNNING_STATUS_ANIMATION_REPEAT_DELAY_SECONDS,
                  ease: 'easeInOut',
                }}
              >
                {character}
              </motion.span>
            ))}
            <span className="sr-only">{RUNNING_STATUS_TEXT}</span>
          </span>
          <span className="tracking-[-0.2em]">
            {[0, 1, 2].map((dotIndex) => (
              <motion.span
                aria-hidden="true"
                key={dotIndex}
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{
                  delay:
                    (RUNNING_STATUS_TEXT.length + dotIndex) *
                    RUNNING_STATUS_CHARACTER_DELAY_SECONDS,
                  duration: RUNNING_STATUS_ANIMATION_DURATION_SECONDS,
                  repeat: Infinity,
                  repeatDelay: RUNNING_STATUS_ANIMATION_REPEAT_DELAY_SECONDS,
                  ease: 'easeInOut',
                }}
              >
                .
              </motion.span>
            ))}
          </span>
        </motion.div>
      )}
    </>
  );
}

export function CodeResult({
  identity,
  execution,
  shell,
  output,
}: CodeBlockResultProps) {
  const { id } = identity;
  const { executionId, status } = execution;
  const { isExpanded, codeMirrorInstance } = shell;
  const {
    lastExecutedResult,
    setLastExecutedResult,
    isWaitingForInput,
    setIsWaitingForInput,
  } = output;

  const resultContainerRef = useRef<HTMLFormElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const [visibleRunningStatusId, setVisibleRunningStatusId] = useState<
    string | null
  >(null);
  const isBusyWithoutInput = status === 'busy' && !isWaitingForInput;
  const showRunningStatus =
    isBusyWithoutInput && visibleRunningStatusId === executionId;
  const { mutate: sendInputReply } = useSendInputReplyMutation(
    id,
    execution.kernelInstanceId
  );

  return (
    <motion.footer
      ref={footerRef}
      onWheel={(event) => {
        // Scrolling does not work without these wheel
        const footer = footerRef.current;
        if (!footer) return;
        const maxScrollTop = footer.scrollHeight - footer.clientHeight;
        const currentScrollTop = Math.min(
          Math.max(footer.scrollTop, 0),
          maxScrollTop
        );
        const canScrollWithWheel =
          (event.deltaY < 0 && currentScrollTop > 0) ||
          (event.deltaY > 0 && currentScrollTop < maxScrollTop);
        const nextScrollTop = Math.min(
          Math.max(currentScrollTop + event.deltaY, 0),
          maxScrollTop
        );
        const didConsumeWheel =
          canScrollWithWheel && nextScrollTop !== currentScrollTop;

        if (didConsumeWheel) {
          footer.scrollTop = nextScrollTop;
          event.stopPropagation();
        }
      }}
      className={cn(
        'group relative shrink-0 overflow-x-hidden overflow-y-auto border-t border-t-zinc-200 dark:border-t-zinc-700 cm-background',
        !isExpanded && 'max-h-[1000px]',
        isExpanded && 'max-h-2/5'
      )}
    >
      <div>
        <RunningStatus
          isRunning={isBusyWithoutInput}
          runId={executionId}
          onVisible={setVisibleRunningStatusId}
        />
        <form
          ref={resultContainerRef}
          onSubmit={(e) => {
            e.preventDefault();
            const submitter = e.nativeEvent
              .submitter as HTMLButtonElement | null;

            const parentDiv = submitter?.parentElement;
            const inputEl = parentDiv?.querySelector('input');

            setIsWaitingForInput(false);
            if (!parentDiv || !inputEl) return;

            const typedInputContentElement = document.createElement('p');
            typedInputContentElement.textContent = inputEl.value;

            parentDiv.replaceWith(typedInputContentElement);

            if (resultContainerRef.current) {
              setLastExecutedResult(resultContainerRef.current.innerHTML);
            }

            if (codeMirrorInstance?.view) {
              codeMirrorInstance.view.focus();
            }

            sendInputReply({
              executionId: crypto.randomUUID(),
              value: inputEl.value,
            });
          }}
          aria-live="polite"
          dangerouslySetInnerHTML={{ __html: lastExecutedResult }}
          className={cn(
            'code-result-output flex flex-col justify-between overflow-x-hidden gap-1.5 relative font-mono text-xs px-2 py-3',
            showRunningStatus && 'italic text-zinc-400 dark:text-zinc-500'
          )}
          style={{ fontFamily: 'var(--code-block-font-family)' }}
        />
      </div>

      <MotionIconButton
        aria-label="Copy output"
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        key={isExpanded.toString()}
        {...getDefaultButtonVariants()}
        onClick={() => {
          if (resultContainerRef.current) {
            void navigator.clipboard.writeText(
              resultContainerRef.current.innerText
            );
          }
        }}
      >
        <Duplicate2 height="1rem" width="1rem" />
      </MotionIconButton>
    </motion.footer>
  );
}
