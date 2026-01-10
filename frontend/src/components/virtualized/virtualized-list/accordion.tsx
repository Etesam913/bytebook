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
  ...props
}: VirtualizedListAccordionProps<T>) {
  const { scope, isReady, handleHeightChange } = useAnimatedHeight({
    isOpen,
    maxHeight,
    onTotalListHeightChanged,
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
        {!isError && !isLoading && (
          <VirtualizedList
            {...props}
            maxHeight={maxHeight}
            onTotalListHeightChanged={handleHeightChange}
          />
        )}
      </div>
    </>
  );
}
