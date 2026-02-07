import { type ReactNode } from 'react';
import { VirtualizedList, type VirtualizedListProps } from './index';
import { useAnimatedHeight } from '../hooks';

interface VirtualizedListAccordionProps<T> extends VirtualizedListProps<T> {
  isOpen: boolean;
  isLoading?: boolean;
  loadingElement?: ReactNode;
  isError?: boolean;
  errorElement?: ReactNode;
}

export function VirtualizedListAccordion<T>({
  isOpen,
  isLoading,
  loadingElement,
  isError,
  errorElement,
  maxHeight,
  onTotalListHeightChanged,
  data,
  emptyElement,
  ...props
}: VirtualizedListAccordionProps<T>) {
  const isEmpty = !data || data.length === 0;
  const { scope, isReady, handleHeightChange } = useAnimatedHeight({
    isOpen,
    maxHeight,
    onTotalListHeightChanged,
    emptyHeight: '50px',
    isEmpty,
  });

  return (
    <>
      {isError && errorElement}
      {!isError && isLoading && loadingElement}
      <div
        ref={scope}
        style={{ visibility: isReady ? 'visible' : 'hidden' }}
        className="overflow-hidden pl-1 scrollbar-hidden"
      >
        {!isError && !isLoading && isEmpty && emptyElement}
        {!isError && !isLoading && !isEmpty && (
          <VirtualizedList
            {...props}
            data={data}
            maxHeight={maxHeight}
            onTotalListHeightChanged={handleHeightChange}
          />
        )}
      </div>
    </>
  );
}
