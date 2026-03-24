import { type ReactNode, useRef } from 'react';
import { VirtualizedList, type VirtualizedListProps } from './index';
import { useAutoScrollDuringDrag } from '../../../hooks/draggable';

interface VirtualizedListAccordionProps<T> extends VirtualizedListProps<T> {
  isLoading?: boolean;
  loadingElement?: ReactNode;
  isError?: boolean;
  errorElement?: ReactNode;
}

export function VirtualizedListAccordion<T>({
  isLoading,
  loadingElement,
  isError,
  errorElement,
  onTotalListHeightChanged,
  data,
  emptyElement,
  ...props
}: VirtualizedListAccordionProps<T>) {
  const isEmpty = !data || data.length === 0;
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const { onDragOver, onDragLeave, onDrop } = useAutoScrollDuringDrag(
    scrollContainerRef,
    { threshold: 60, speed: 20 }
  );

  return (
    <>
      {isError && errorElement}
      {!isError && isLoading && loadingElement}
      {!isError && !isLoading && isEmpty && <div>{emptyElement}</div>}
      {!isError && !isLoading && !isEmpty && (
        <div
          className="flex flex-1 flex-col min-h-0 overflow-hidden scrollbar-hidden"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <VirtualizedList
            {...props}
            data={data}
            onTotalListHeightChanged={onTotalListHeightChanged}
            scrollContainerRef={scrollContainerRef}
          />
        </div>
      )}
    </>
  );
}
