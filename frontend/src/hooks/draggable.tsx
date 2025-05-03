import { useEffect, useRef, type RefObject } from 'react';

type UseAutoScrollOptions = {
  /**
   * Distance in pixels from the container edge where scrolling starts.
   * Default is 50.
   */
  threshold?: number;
  /**
   * Number of pixels to scroll per frame.
   * Default is 10.
   */
  speed?: number;
};

/**
 * useAutoScrollDuringDrag
 * Attaches drag-over and drag-leave handlers to automatically scroll
 * a container when a draggable item is dragged near its top/bottom edges.
 */
export function useAutoScrollDuringDrag(
  containerRef: RefObject<HTMLElement | null>,
  options: UseAutoScrollOptions = {}
) {
  const { threshold = 50, speed = 10 } = options;
  const scrollStep = useRef(0);
  const frameId = useRef<number>(0);

  const step = () => {
    const container = containerRef.current;
    if (!container) return;
    const dy = scrollStep.current;
    if (dy !== 0) {
      container.scrollBy({ top: dy, left: 0, behavior: 'smooth' });
      frameId.current = requestAnimationFrame(step);
    }
  };

  const stop = () => {
    if (frameId.current) {
      cancelAnimationFrame(frameId.current);
      frameId.current = 0;
    }
    scrollStep.current = 0;
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let dy = 0;

    // Vertical scrolling only
    if (e.clientY < rect.top + threshold) {
      dy = -speed;
    } else if (e.clientY > rect.bottom - threshold) {
      dy = speed;
    }

    scrollStep.current = dy;
    if (!frameId.current && dy !== 0) {
      frameId.current = requestAnimationFrame(step);
    }
  };

  // Stop scrolling when dragging leaves or drops
  const onDragLeave = stop;
  const onDrop = stop;

  // Cleanup on unmount
  useEffect(() => {
    return () => stop();
  }, []);

  return { onDragOver, onDragLeave, onDrop };
}
