import { motion } from 'motion/react';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { LoadingSpinner } from '../../../loading-spinner';
import type { LoadMoreItem } from '../types';
import { FileTreeItemContainer } from './index';

export function LoadMoreRow({
  dataItem,
  paddingLeft,
  setHoveredItemRailPath,
  hoveredItemRailPath,
  showRail,
  onLoadMore,
}: {
  dataItem: LoadMoreItem;
  paddingLeft: number;
  setHoveredItemRailPath: Dispatch<SetStateAction<string>>;
  hoveredItemRailPath: string;
  showRail: boolean;
  onLoadMore: () => void;
}) {
  useEffect(() => {
    onLoadMore();
  }, [onLoadMore]);

  return (
    <FileTreeItemContainer
      paddingLeft={paddingLeft}
      dataItem={dataItem}
      setHoveredItemRailPath={setHoveredItemRailPath}
      hoveredItemRailPath={hoveredItemRailPath}
      showRail={showRail}
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
