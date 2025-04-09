import { useRef } from 'react';
import { easingFunctions, getDefaultButtonVariants } from '../../animations';
import { MotionIconButton } from '../buttons';
import { Duplicate2 } from '../../icons/duplicate-2';
import { AnimatePresence, motion } from 'motion/react';
import { CodeBlockStatus } from '../../types';
import { Loader } from '../../icons/loader';
import { cn } from '../../utils/string-formatting';

export function CodeResult({
  lastExecutedResult,
  isExpanded,
  status,
}: {
  lastExecutedResult: string;
  isExpanded: boolean;
  status: CodeBlockStatus;
}) {
  const resultContainerRef = useRef<HTMLDivElement>(null);
  return (
    <motion.footer
      key={isExpanded.toString()}
      layout
      className={cn(
        'group relative border-t-1 border-t-zinc-200 dark:border-t-zinc-700 min-h-11 bg-white dark:bg-[#2e3440]',
        isExpanded && 'h-1/5'
      )}
    >
      <AnimatePresence>
        {status === 'busy' && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-zinc-400/20 dark:bg-zinc-900/20"
          >
            <motion.div
              layout
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ ease: easingFunctions['ease-in-out-cubic'] }}
            >
              <Loader width={16} height={16} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-y-auto h-full">
        <motion.div
          layout="position"
          ref={resultContainerRef}
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
