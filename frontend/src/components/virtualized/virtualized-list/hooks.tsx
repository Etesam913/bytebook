import { type RefObject, useEffect, useRef } from 'react';
import { VirtuosoHandle } from 'react-virtuoso';

/**
 * Checks if a child element is fully visible within its parent scrolling container.
 */
function isElementFullyVisible(
  item: HTMLElement,
  scroller: HTMLElement
): boolean {
  const itemRect = item.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();

  const TOLERANCE = 4; // 4px tolerance for subpixel rendering and borders
  const isAbove = itemRect.top < scrollerRect.top - TOLERANCE;
  const isBelow = itemRect.bottom > scrollerRect.bottom + TOLERANCE;

  return !isAbove && !isBelow;
}

/**
 * useSmartScroll is a custom React hook intended for use with virtualized lists (such as react-virtuoso).
 * It provides:
 * - A ref to be attached to the Virtuoso component.
 * - A callback to keep track of the currently rendered item range.
 * - A method to scroll to a particular index only if it is not currently visible.
 */
export function useSmartScroll(
  scrollElementRef?: RefObject<HTMLElement | null>
) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const rangeRef = useRef({ startIndex: 0, endIndex: 0 });

  // We use a callback for rangeChanged to avoid unnecessary re-renders
  const onRangeChanged = (range: { startIndex: number; endIndex: number }) => {
    rangeRef.current = range;
  };

  const scrollToIndexIfHidden = (index: number) => {
    const { startIndex, endIndex } = rangeRef.current;

    // Check if the index is outside the current rendered range
    let isVisible = index >= startIndex && index <= endIndex;

    // If it is within the rendered range, double check if it's fully visible in the DOM
    if (isVisible && scrollElementRef?.current) {
      const itemElement = scrollElementRef.current.querySelector<HTMLElement>(
        `[data-item-index="${index}"]`
      );
      if (
        itemElement &&
        !isElementFullyVisible(itemElement, scrollElementRef.current)
      ) {
        isVisible = false;
      }
    }

    if (!isVisible && virtuosoRef.current) {
      setTimeout(() => {
        if (!virtuosoRef.current) return;
        virtuosoRef.current.scrollIntoView({
          index,
        });
      }, 100);
    }
  };

  return { virtuosoRef, onRangeChanged, scrollToIndexIfHidden };
}

/**
 * usePreventBoundaryOverscroll is a custom React hook intended for use with virtualized lists (such as react-virtuoso)
 * that prevents a weird flicker when scrolling past the end or before the beginning of the virtualized list
 */
export function usePreventBoundaryOverscrollFlicker({
  scrollElementRef,
}: {
  scrollElementRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      const atTop = scrollElement.scrollTop <= 0;
      const atBottom =
        scrollElement.scrollTop + scrollElement.clientHeight >=
        scrollElement.scrollHeight;
      const isBoundaryAttempt =
        (event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom);

      if (isBoundaryAttempt) {
        event.preventDefault();
      }
    };

    scrollElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      scrollElement.removeEventListener('wheel', handleWheel);
    };
  }, [scrollElementRef]);
}
