import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { ChevronDown } from '../../icons/chevron-down';
import { cn } from '../../utils/string-formatting';

export function AccordionButton({
  icon,
  title,
  isOpen,
  onClick,
  className,
  // This is needed for a tooltip to show on the button
  ...props
}: {
  icon: ReactNode;
  title: ReactNode;
  isOpen: boolean;
  className?: string;
  onClick: () => void;
  [key: string]: any;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center w-full gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {icon}
      <p>{title}</p>
      <motion.span
        className="ml-auto"
        initial={{ rotateZ: isOpen ? 180 : 0 }}
        animate={{ rotateZ: isOpen ? 180 : 0 }}
      >
        <ChevronDown strokeWidth="2.5px" className="will-change-transform" />
      </motion.span>
    </button>
  );
}
