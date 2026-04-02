import { type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/string-formatting';
import { easingFunctions } from '../../animations';

export function SidebarAccordionPanel({
  isOpen,
  trigger,
  children,
  flexWeight = 1,
}: {
  isOpen: boolean;
  trigger: ReactNode;
  children: ReactNode;
  flexWeight?: number;
}) {
  return (
    <motion.section
      animate={{ flexGrow: isOpen ? flexWeight : 0 }}
      transition={{ ease: easingFunctions['ease-out-cubic'] }}
      className={cn(
        'flex flex-col min-w-0 overflow-hidden',
        isOpen ? 'min-h-0' : ''
      )}
      style={{
        flexShrink: isOpen ? 1 : 0,
        flexBasis: 'auto',
      }}
    >
      {trigger}
      {children && (
        <div className="flex flex-1 basis-0 min-h-0 min-w-0 flex-col overflow-hidden">
          {children}
        </div>
      )}
    </motion.section>
  );
}
