import { motion } from 'motion/react';
import { LoadingSpinner } from '../loading-spinner';

export function RouteFallback({
  height,
  width,
  className,
}: {
  height?: string;
  width?: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="grow flex flex-1 h-full items-center justify-center"
    >
      <LoadingSpinner height={height} width={width} className={className} />
    </motion.div>
  );
}
