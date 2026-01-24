import { motion } from 'motion/react';
import { useEffect } from 'react';
import { LoadingSpinner } from '../../../loading-spinner';
import { FileTreeItemContainer } from './index';

export function LoadMoreRow({
  paddingLeft,
  onLoadMore,
}: {
  paddingLeft: number;
  onLoadMore: () => void;
}) {
  useEffect(() => {
    onLoadMore();
  }, [onLoadMore]);

  return (
    <FileTreeItemContainer
      paddingLeft={paddingLeft}
      footer={
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <LoadingSpinner className="ml-11 my-1.25" height={16} width={16} />
        </motion.div>
      }
    />
  );
}
