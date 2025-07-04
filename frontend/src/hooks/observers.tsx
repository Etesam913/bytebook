import { useAtomValue } from 'jotai/react';
import { type RefObject, useEffect, useState } from 'react';
import { noteIntersectionObserverAtom } from '../atoms';

/**
 * Custom hook for implementing list virtualization.
 * This hook optimizes rendering performance for large lists by only rendering visible items.
 *
 * @param items - Array of items to be virtualized
 * @param SIDEBAR_ITEM_HEIGHT - Height of each item in pixels
 * @param VIRUTALIZATION_HEIGHT - Additional height to render above and below the visible area
 * @param listRef - React ref object for the container element
 * @returns Object containing virtualization data and functions
 */
export function useListVirtualization(
  items: string[],
  SIDEBAR_ITEM_HEIGHT: number,
  VIRUTALIZATION_HEIGHT: number,
  listRef: RefObject<HTMLElement | null>,
  onScrollCallback?: (e: React.UIEvent<HTMLDivElement>) => void,
  isSearchPanel?: boolean
) {
  // State for tracking scroll position and container height
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate the range of visible items. There is a -2 so that items are above the visible area as well
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / SIDEBAR_ITEM_HEIGHT - (isSearchPanel ? 0 : 2))
  );
  const endIndex = Math.min(
    startIndex +
      Math.ceil(
        containerHeight / (SIDEBAR_ITEM_HEIGHT - VIRUTALIZATION_HEIGHT)
      ),
    items.length
  );
  const visibleItems = items.slice(startIndex, endIndex);

  // Update container height when resized
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      const container = entries[0].target;
      setContainerHeight(container.getBoundingClientRect().height);
    });
    if (listRef.current) {
      resizeObserver.observe(listRef.current);
    }
    return () => {
      resizeObserver.disconnect();
    };
  }, [listRef]);

  // Handle scroll events
  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    if (visibleItems.length > 0) {
      setScrollTop(Math.max(0, (e.target as HTMLElement).scrollTop));
      onScrollCallback?.(e);
    }
  }

  // Return virtualization data and functions
  return {
    listContainerHeight: `${items.length * SIDEBAR_ITEM_HEIGHT}px`,
    listHeight: `${visibleItems.length * SIDEBAR_ITEM_HEIGHT}px`,
    listTop: `${startIndex * SIDEBAR_ITEM_HEIGHT}px`,
    onScroll,
    visibleItems,
    startIndex,
    endIndex,
    setScrollTop,
  };
}

/**
 * Custom hook for showing an element when it enters the viewport.
 *
 * @param loaderRef - React ref object for the loader element
 * @param isExpanded - Boolean indicating whether the image is expanded
 * @param isImageInViewport - Boolean indicating whether the image is in the viewport
 */
export function useShowWhenInViewport(
  loaderRef: RefObject<HTMLDivElement | null>
) {
  const noteIntersectionObserver = useAtomValue(noteIntersectionObserverAtom);

  useEffect(() => {
    if (!loaderRef.current || !noteIntersectionObserver) return;
    noteIntersectionObserver?.observe(loaderRef.current);
    return () => {
      if (!loaderRef.current || !noteIntersectionObserver) return;
      noteIntersectionObserver.unobserve(loaderRef.current);
    };
  }, [loaderRef]);

  // Scroll to the bottom when the image is expanded. When spamming the next image, there is a small chance that the image does not show up. This fixes that
  // useEffect(() => {
  //   if (isExpanded) {
  //     loaderRef.current?.scrollIntoView({
  //       block: 'end',
  //     });
  //   }
  // }, [isExpanded]);
}
