import { useRef } from 'react';
import { easingFunctions, getDefaultButtonVariants } from '../../animations';
import { MotionIconButton } from '../buttons';
import { Duplicate2 } from '../../icons/duplicate-2';
import { AnimatePresence, motion } from 'motion/react';
import { CodeBlockStatus, Languages } from '../../types';
import { Loader } from '../../icons/loader';
import { cn } from '../../utils/string-formatting';
import { useSendInputReplyMutation } from '../../hooks/code';
import type { CodeMirrorRef } from './types';

export function CodeResult({
  id,
  language,
  lastExecutedResult,
  setLastExecutedResult,
  isExpanded,
  status,
  isWaitingForInput,
  setIsWaitingForInput,
  codeMirrorInstance,
}: {
  id: string;
  language: Languages;
  lastExecutedResult: string;
  setLastExecutedResult: (lastExecutedResult: string) => void;
  isExpanded: boolean;
  status: CodeBlockStatus;
  isWaitingForInput: boolean;
  setIsWaitingForInput: (isWaitingForInput: boolean) => void;
  codeMirrorInstance: CodeMirrorRef;
}) {
  const resultContainerRef = useRef<HTMLFormElement>(null);
  const { mutate: sendInputReply } = useSendInputReplyMutation(id, language);
  return (
    <motion.footer
      className={cn(
        'group overflow-hidden hover:overflow-auto relative border-t-1 border-t-zinc-200 dark:border-t-zinc-700 min-h-11 cm-background',
        !isExpanded && 'max-h-[1000px]',
        isExpanded && 'min-h-1/5 max-h-2/5'
      )}
    >
      <AnimatePresence>
        {status === 'busy' && !isWaitingForInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.325 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-zinc-400/20 dark:bg-zinc-900/20"
          >
            <motion.div
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{
                delay: 0.325,
                ease: easingFunctions['ease-in-out-cubic'],
              }}
            >
              <Loader width={16} height={16} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-y-auto h-full">
        <form
          ref={resultContainerRef}
          onSubmit={(e) => {
            e.preventDefault();
            const submitter = (e.nativeEvent as SubmitEvent)
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
          dangerouslySetInnerHTML={{ __html: lastExecutedResult }}
          className="flex flex-col justify-between overflow-x-hidden gap-1.5 relative font-code text-xs px-2 py-3"
        />
      </div>

      <MotionIconButton
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        key={isExpanded.toString()}
        {...getDefaultButtonVariants()}
        onClick={() => {
          if (resultContainerRef.current) {
            navigator.clipboard.writeText(resultContainerRef.current.innerText);
          }
        }}
      >
        <Duplicate2 height={16} width={16} />
      </MotionIconButton>
    </motion.footer>
  );
}
