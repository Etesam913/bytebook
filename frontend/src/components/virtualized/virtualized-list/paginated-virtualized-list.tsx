import type { ReactNode } from 'react';
import { VirtualizedList, type VirtualizedListProps } from './index';

export type PaginatedVirtualizedListProps<T> = VirtualizedListProps<T> & {
  /** Total count of all items across all pages */
  totalCount: number;
};

/**
 * A wrapper around VirtualizedList that adds pagination support.
 * Calls endReached/startReached when scrolling reaches the boundaries.
 */
export function PaginatedVirtualizedList<T>(
  props: PaginatedVirtualizedListProps<T>
): ReactNode {
  const {
    data,
    endReached,
    startReached,
    initialTopMostItemIndex,
    totalCount,
    firstItemIndex,
    ...rest
  } = props;

  return (
    <VirtualizedList<T>
      {...rest}
      data={data}
      endReached={endReached}
      startReached={startReached}
      initialTopMostItemIndex={initialTopMostItemIndex}
      totalCount={totalCount}
      firstItemIndex={firstItemIndex}
    />
  );
}
