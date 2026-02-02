import { motion } from 'motion/react';
import { useEffect } from 'react';
import { LoadingSpinner } from '../../../loading-spinner';
import { useAtomValue } from 'jotai';
import { currentZoomAtom } from '../../../../hooks/resize';
import { getFileTreeItemIndent } from '../utils/file-tree-utils';

export function LoadMoreRow({
  level,
  onLoadMore,
}: {
  level: number;
  onLoadMore: () => void;
}) {
  const currentZoom = useAtomValue(currentZoomAtom);
  const paddingLeft = getFileTreeItemIndent(level, currentZoom);

  useEffect(() => {
    onLoadMore();
  }, [onLoadMore]);

  return (
    <div style={{ paddingLeft: `${paddingLeft}px` }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <LoadingSpinner className="ml-11 my-1.25" height={16} width={16} />
      </motion.div>
    </div>
  );
}
