import { useAnimate } from 'motion/react';
import { useState, type ReactNode, useEffect, useRef } from 'react';
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
  // null = not yet measured, number = measured (including 0 for empty lists)
  const [totalHeight, setTotalHeight] = useState<number | null>(null);
  const [scope, animate] = useAnimate();
  const hasMeasured = useRef(false);

  // Compute whether we've completed the initial measurement
  const isReady = totalHeight !== null;

  useEffect(() => {
    // If the list hasn't calculated a height yet, do nothing (wait).
    if (totalHeight === null) return;

    const targetHeight = maxHeight
      ? `min(${totalHeight}px, ${maxHeight})`
      : totalHeight;

    // Logic: Instant snap vs Smooth animation
    if (!hasMeasured.current) {
      // FIRST LOAD: The height just arrived.
      // If we are open, snap to height instantly (duration: 0).
      // If we are closed, snap to 0 instantly.
      if (isOpen) {
        animate(scope.current, { height: targetHeight }, { duration: 0 });
      } else {
        animate(scope.current, { height: 0 }, { duration: 0 });
      }
      hasMeasured.current = true;
    } else {
      // SUBSEQUENT UPDATES: User toggled 'isOpen', or list grew.
      // Animate smoothly.
      const height = isOpen ? targetHeight : 0;
      animate(
        scope.current,
        { height },
        { type: 'spring', damping: 17, stiffness: 115 }
      );
    }
  }, [totalHeight, isOpen, maxHeight, animate]);

  return (
    <div
      ref={scope}
      style={{ visibility: isReady ? 'visible' : 'hidden' }}
      className="overflow-hidden pl-1 scrollbar-hidden"
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
    </div>
  );
}
