import { motion } from 'motion/react';
import { useEffect } from 'react';
import { LoadingSpinner } from '../../../loading-spinner';
import { getFileTreeItemIndent } from '../utils/file-tree-utils';

export function LoadMoreRow({
  level,
  onLoadMore,
}: {
  level: number;
  onLoadMore: () => void;
}) {
  const paddingLeft = getFileTreeItemIndent(level);
  // const hasFiredRef = useRef(false);

  useEffect(() => {
    onLoadMore();
  }, []);

  return (
    <div style={{ paddingLeft }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <LoadingSpinner className="ml-11 my-1.25" height="1rem" width="1rem" />
      </motion.div>
    </div>
  );
}
