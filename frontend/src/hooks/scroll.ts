import { type RefObject, useEffect } from 'react';

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
