import { motion } from 'motion/react';
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from 'react';
import { ChevronDown } from '../../icons/chevron-down';
import { cn } from '../../utils/string-formatting';

type AccordionButtonProps = {
  icon: ReactNode;
  title: ReactNode;
  isOpen: boolean;
  className?: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'children' | 'onClick' | 'className' | 'title'
>;

export function AccordionButton({
  icon,
  title,
  isOpen,
  onClick,
  className,
  ...props
}: AccordionButtonProps) {
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
