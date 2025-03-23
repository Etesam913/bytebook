import { motion } from 'motion/react';
import { easingFunctions } from '../../animations';
import { cn } from '../../utils/string-formatting';

export function SidebarHighlight({
  layoutId,
  className,
}: {
  layoutId: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ ease: easingFunctions['ease-out-expo'] }}
      layoutId={layoutId}
      className={cn(
        'absolute pointer-events-none z-5 h-full w-full bg-zinc-100 dark:bg-zinc-650 rounded-md',
        className
      )}
    />
  );
}
