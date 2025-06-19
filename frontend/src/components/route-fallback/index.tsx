import { motion } from 'motion/react';
import { LoadingSpinner } from '../loading-spinner';

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
      <LoadingSpinner height={height} width={width} className={className} />
    </motion.div>
  );
}
