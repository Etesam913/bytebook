import { AnimatePresence, motion } from 'motion/react';

type AccordionButtonDividerProps = {
  isOpen: boolean;
};

export function AccordionButtonDivider({
  isOpen,
}: AccordionButtonDividerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.hr
          className="text-zinc-200 dark:text-zinc-600 mx-1.5"
          initial={{ opacity: 0, marginBottom: -2 }}
          animate={{ opacity: 1, marginBottom: 4 }}
          exit={{ opacity: 0, marginBottom: 0 }}
        />
      )}
    </AnimatePresence>
  );
}
