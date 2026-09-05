import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Button, type ButtonProps } from 'react-aria-components/Button';
import { ChevronDown } from '@/icons/chevron-down';
import { cn } from '@utils/string-formatting';

export function AccordionButton({
  icon,
  title,
  isOpen,
  onPress,
  className,
  ...props
}: {
  icon: ReactNode;
  title: ReactNode;
  isOpen: boolean;
  className?: string;
  onPress: () => void;
} & Omit<ButtonProps, 'children' | 'className' | 'onPress' | 'onClick'>) {
  return (
    <Button
      aria-expanded={isOpen}
      className={cn(
        'relative flex items-center w-full gap-1.5 px-2 py-1.25 bg-zinc-50 border-zinc-200 dark:border-zinc-600 border-y-[1.25px] dark:bg-zinc-750 hover:bg-zinc-100 dark:hover:bg-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--accent-color)',
        className
      )}
      onPress={onPress}
      {...props}
    >
      {icon}
      <p>{title}</p>
      <motion.span
        className="ml-auto cursor-pointer"
        initial={{ rotateZ: isOpen ? 180 : 0 }}
        animate={{ rotateZ: isOpen ? 180 : 0 }}
      >
        <ChevronDown strokeWidth={2.5} className="will-change-transform" />
      </motion.span>
    </Button>
  );
}
