import { RefObject, useEffect } from 'react';

/** Helps to prevent a weird trackpad bug where scrolling past the top or bottom of the file tree would cause the list to flicker */
export function usePreventOverscroll({
  internalListRef,
  listHeight,
  stickyContentHeight,
}: {
  internalListRef: RefObject<HTMLElement | null>;
  listHeight: number;
  stickyContentHeight: number;
}) {
  useEffect(() => {
    const scroller = internalListRef.current;
    if (!scroller) return;

    function handleWheel(event: WheelEvent) {
      const activeScroller = internalListRef.current;
      if (!activeScroller) return;

      const maxScrollTop = Math.max(
        0,
        activeScroller.scrollHeight - activeScroller.clientHeight
      );
      const isAtTop = activeScroller.scrollTop <= 1 && event.deltaY < 0;
      const isAtBottom =
        maxScrollTop - activeScroller.scrollTop <= 1 && event.deltaY > 0;

      if (!isAtTop && !isAtBottom) {
        return;
      }

      event.preventDefault();
    }

    scroller.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      scroller.removeEventListener('wheel', handleWheel);
    };
  }, [listHeight, stickyContentHeight]);
}
