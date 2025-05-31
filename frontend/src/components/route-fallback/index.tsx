import { motion } from 'motion/react';
import { Loader } from '../../icons/loader';

export function RouteFallback({
  height,
  width,
  className,
}: {
  height?: number;
  width?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="flex-grow flex items-center justify-center"
    >
      <div className="animate-pulse text-gray-500 dark:text-zinc-400">
        <Loader height={height} width={width} className={className} />
      </div>
    </motion.div>
  );
}
