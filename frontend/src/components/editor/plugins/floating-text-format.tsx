import type { CSSProperties, ReactNode } from 'react';
import type { UseInteractionsReturn } from '@floating-ui/react';
import { AnimatePresence, motion } from 'motion/react';
import { easingFunctions } from '@/animations';

export function FloatingTextFormatMenu({
  isOpen,
  floatingStyles,
  setFloating,
  getFloatingProps,
  children,
}: {
  isOpen: boolean;
  floatingStyles: CSSProperties;
  setFloating: (node: HTMLElement | null) => void;
  getFloatingProps: UseInteractionsReturn['getFloatingProps'];
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.form
          ref={setFloating}
          aria-label="Text formatting toolbar"
          data-testid="floating-toolbar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={floatingStyles}
          transition={{ ease: easingFunctions['ease-out-circ'] }}
          className="bg-zinc-50/92.5 dark:bg-zinc-700/92.5 p-1 rounded-md shadow-lg flex items-center gap-2 z-10 border border-zinc-300 dark:border-zinc-600"
          onSubmit={(event) => event.preventDefault()}
          {...getFloatingProps()}
        >
          {children}
        </motion.form>
      )}
    </AnimatePresence>
  );
}
