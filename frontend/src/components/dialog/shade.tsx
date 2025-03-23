import { motion } from 'motion/react';
import { cn } from '../../utils/string-formatting';

export function Shade({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
      }}
      className={cn(
        'fixed z-30 left-0 top-0 w-screen h-screen bg-[rgba(0,0,0,0.35)]',
        className
      )}
    />
  );
}
