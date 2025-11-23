import { motion, type HTMLMotionProps } from 'motion/react';
import { cn } from '../utils/string-formatting';

export function SelectionHighlight({
  className,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={cn(
        'pointer-events-none absolute z-10 top-0 left-0 w-full h-full bg-(--accent-color-highlight-low)',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.15 } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      {...props}
    />
  );
}
