import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { VirtualizedList, type VirtualizedListProps } from './index';

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
  const [totalHeight, setTotalHeight] = useState(0);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0 }}
          animate={{
            height: maxHeight
              ? `min(${totalHeight}px, ${maxHeight})`
              : totalHeight,
            transition: { type: 'spring', damping: 16 },
          }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden hover:overflow-auto pl-1"
        >
          {isError && errorElement}
          {!isError && isLoading && loadingElement}
          {!isError && !isLoading && (
            <VirtualizedList
              {...props}
              maxHeight={maxHeight}
              onTotalListHeightChanged={(height) => {
                setTotalHeight(height);
                onTotalListHeightChanged?.(height);
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
