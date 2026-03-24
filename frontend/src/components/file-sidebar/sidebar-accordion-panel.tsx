import { type ReactNode, useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/string-formatting';
import { easingFunctions } from '../../animations';

export function SidebarAccordionPanel({
  isOpen,
  children,
  flexWeight = 1,
}: {
  isOpen: boolean;
  children: ReactNode;
  flexWeight?: number;
}) {
  const panelRef = useRef<HTMLElement | null>(null);

  return (
    <motion.section
      ref={panelRef}
      animate={{ flexGrow: isOpen ? flexWeight : 0 }}
      transition={{ ease: easingFunctions['ease-out-cubic'] }}
      className={cn(
        'flex flex-col min-w-0 overflow-hidden',
        isOpen ? 'min-h-0' : ''
      )}
      style={{ flexShrink: isOpen ? 1 : 0, flexBasis: 'auto' }}
    >
      {children}
    </motion.section>
  );
}
