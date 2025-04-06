import { useRef } from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { MotionIconButton } from '../buttons';
import { Duplicate2 } from '../../icons/duplicate-2';
import { motion } from 'motion/react';

export function CodeResult({
  lastExecutedResult,
  isExpanded,
}: {
  lastExecutedResult: string;
  isExpanded: boolean;
}) {
  const resultContainerRef = useRef<HTMLDivElement>(null);

  return (
    <motion.footer
      key={isExpanded.toString()}
      className="relative overflow-hidden border-t-1 border-t-zinc-200 dark:border-t-zinc-700 min-h-11 max-h-[calc(35vh-3.6rem)]"
    >
      <motion.div
        layout="position"
        ref={resultContainerRef}
        dangerouslySetInnerHTML={{ __html: lastExecutedResult }}
        className="flex flex-col justify-between max-h-[calc(35vh-3.6rem)] overflow-x-hidden overflow-y-auto gap-1.5 relative font-code text-xs px-2 py-3"
      />
      <MotionIconButton
        layout="position"
        className="absolute right-2 top-2"
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
