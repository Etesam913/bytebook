import { useAtomValue } from 'jotai/react';
import {
  CSSProperties,
  type RefObject,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { noteIntersectionObserverAtom } from '../components/editor/atoms';

/**
 * Custom hook for implementing list virtualization.
 * This hook optimizes rendering performance for large lists by only rendering visible items.
 *
 * @param items - Array of items to be virtualized. Can be any type.
 * @param itemHeight - The fixed height of each item in pixels.
 * @param listRef - React ref object for the scrollable container element.
 * @param overscan - The number of extra items to render above and below the visible area. Defaults to 2.
 */
export function useListVirtualization<T>({
  items,
  itemHeight,
  listRef,
  overscan = 2,
}: {
  items: T[];
  itemHeight: number;
  listRef: RefObject<HTMLElement | null>;
  overscan?: number;
}): {
  onScroll: (e: React.UIEvent<HTMLElement>) => void;
  visibleItems: T[];
  outerContainerStyle: CSSProperties;
  innerContainerStyle: CSSProperties;
  startIndex: number;
} {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Observe the container's height and update state
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    // Makes sure that container height is up to date
    setContainerHeight(container.clientHeight);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [listRef]);

  const virtualizer = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);

    // Calculate the start index, including overscan
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );

    // Calculate the end index, including overscan
    const endIndex = Math.min(
      items.length,
      startIndex + visibleItemCount + overscan * 2
    );

    const visibleItems = items.slice(startIndex, endIndex);

    // Style for the outer container that provides the scrollbar
    const outerContainerStyle: CSSProperties = {
      position: 'relative',
      overflowX: 'hidden',
      textOverflow: 'ellipsis',
      height: `${totalHeight}px`,
    };

    // Style for the inner container that "moves" up and down
    const innerContainerStyle: CSSProperties = {
      position: 'absolute',
      width: '100%',
      transform: `translateY(${startIndex * itemHeight}px)`,
    };

    return {
      startIndex,
      visibleItems,
      outerContainerStyle,
      innerContainerStyle,
    };
  }, [scrollTop, containerHeight, items, itemHeight, overscan]);

  // Handle scroll events
  function onScroll(e: React.UIEvent<HTMLElement>) {
    setScrollTop(e.currentTarget.scrollTop);
  }

  return {
    ...virtualizer,
    onScroll,
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
}
