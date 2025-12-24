import { useRef } from 'react';
import { VirtuosoHandle } from 'react-virtuoso';

/**
 * useSmartScroll is a custom React hook intended for use with virtualized lists (such as react-virtuoso).
 * It provides:
 * - A ref to be attached to the Virtuoso component.
 * - A callback to keep track of the currently rendered item range.
 * - A method to scroll to a particular index only if it is not currently visible.
 *
 *
 *
 */
export function useSmartScroll() {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const rangeRef = useRef({ startIndex: 0, endIndex: 0 });

  // We use a callback for rangeChanged to avoid unnecessary re-renders
  const onRangeChanged = (range) => {
    rangeRef.current = range;
  };

  const scrollToIndexIfHidden = (index: number) => {
    const { startIndex, endIndex } = rangeRef.current;

    // Check if the index is outside the current rendered range
    const isVisible = index >= startIndex && index <= endIndex;

    if (!isVisible && virtuosoRef.current) {
      setTimeout(() => {
        if (!virtuosoRef.current) return;
        virtuosoRef.current.scrollToIndex({
          index,
        });
      }, 100);
    }
  };

  return { virtuosoRef, onRangeChanged, scrollToIndexIfHidden };
}
