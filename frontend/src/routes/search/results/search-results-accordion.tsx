import { ReactNode } from 'react';
import { cn } from '../../../utils/string-formatting';
import { motion } from 'motion/react';

export function SearchResultsAccordion({
  title,
  count,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        className={cn(
          'px-2 py-1 w-full flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700 bg-transparent select-none',
          'transition-colors duration-100 hover:bg-zinc-100 dark:hover:bg-zinc-700'
        )}
        onClick={onToggle}
        aria-expanded={isOpen}
        tabIndex={0}
      >
        <motion.span
          initial={{ rotate: 0 }}
          animate={{ rotate: isOpen ? 90 : 0 }}
          className={'inline-block'}
          aria-hidden="true"
        >
          ▶
        </motion.span>
        {title} ({count})
      </button>
      {isOpen && <>{children}</>}
    </>
  );
}
