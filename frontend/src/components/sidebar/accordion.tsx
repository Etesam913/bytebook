import { AnimatePresence, motion } from 'motion/react';
import type { JSX, ReactNode } from 'react';
import { AccordionButton } from './accordion-button';
import { cn } from '../../utils/string-formatting';

export function SidebarAccordion({
  onClick,
  isOpen,
  children,
  title,
  icon,
  buttonClassName,
  listClassName,
}: {
  onClick: () => void;
  isOpen: boolean;
  children: ReactNode;
  title: string;
  icon?: JSX.Element;
  buttonClassName?: string;
  listClassName?: string;
}) {
  return (
    <section>
      <AccordionButton
        onClick={onClick}
        isOpen={isOpen}
        title={title}
        icon={icon}
        className={buttonClassName}
      />
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ height: 0 }}
            animate={{
              height: 'auto',
              transition: { type: 'spring', damping: 16 },
            }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              'overflow-hidden hover:overflow-auto pl-1',
              listClassName
            )}
          >
            {children}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}
