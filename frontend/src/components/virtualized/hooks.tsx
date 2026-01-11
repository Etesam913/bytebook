import { useAnimate } from 'motion/react';
import { useState, useEffect, useRef } from 'react';

interface UseAnimatedHeightOptions {
  isOpen: boolean;
  maxHeight?: string;
  onTotalListHeightChanged?: (height: number) => void;
}

export function useAnimatedHeight({
  isOpen,
  maxHeight,
  onTotalListHeightChanged,
}: UseAnimatedHeightOptions) {
  // null = not yet measured, number = measured (including 0 for empty lists)
  const [totalHeight, setTotalHeight] = useState<number | null>(null);
  const [scope, animate] = useAnimate();
  const hasMeasured = useRef(false);
  const prevIsOpen = useRef(isOpen);

  // Compute whether we've completed the initial measurement
  const isReady = totalHeight !== null;

  useEffect(() => {
    // If the list hasn't calculated a height yet and we're open, set a temporary height so Virtuoso can measure
    if (totalHeight === null) {
      if (isOpen && scope.current) {
        // Set a temporary height so Virtuoso can measure
        animate(
          scope.current,
          { height: maxHeight || '100%' },
          { duration: 0 }
        );
      } else {
        animate(scope.current, { height: 0 }, { duration: 0 });
        hasMeasured.current = true;
      }
      return;
    }

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
      // SUBSEQUENT UPDATES: User toggled 'isOpen', or list grew/shrank.
      const height = isOpen ? targetHeight : 0;
      const isOpenChanged = prevIsOpen.current !== isOpen;

      if (isOpenChanged) {
        // Animate smoothly only when accordion opens/closes
        animate(
          scope.current,
          { height },
          { type: 'spring', damping: 17, stiffness: 115 }
        );
      } else {
        // Snap instantly for data-driven height changes (folder expand/collapse within the tree)
        animate(scope.current, { height }, { duration: 0 });
      }
    }
    prevIsOpen.current = isOpen;
  }, [totalHeight, isOpen, maxHeight, animate, scope]);

  const handleHeightChange = (height: number) => {
    setTotalHeight(height);
    onTotalListHeightChanged?.(height);
  };

  return {
    scope,
    isReady,
    handleHeightChange,
    totalHeight,
  };
}
