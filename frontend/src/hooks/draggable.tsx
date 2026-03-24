import {
  useEffect,
  useRef,
  type DragEvent as ReactDragEvent,
  type RefObject,
} from 'react';

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

  const handleDragOver = (clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let dy = 0;

    // Vertical scrolling only
    if (clientY < rect.top + threshold) {
      dy = -speed;
    } else if (clientY > rect.bottom - threshold) {
      dy = speed;
    }

    scrollStep.current = dy;
    if (!frameId.current && dy !== 0) {
      frameId.current = requestAnimationFrame(step);
    } else if (dy === 0) {
      stop();
    }
  };

  const onDragOver = (e: ReactDragEvent) => {
    handleDragOver(e.clientY);
  };

  // Stop scrolling when dragging leaves or drops
  const onDragLeave = stop;
  const onDrop = stop;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeDragOver = (event: DragEvent) => {
      handleDragOver(event.clientY);
    };

    const handleNativeStop = () => {
      stop();
    };

    // Capture-phase listeners ensure autoscroll still sees drag events even if
    // nested drop targets stop propagation during bubbling.
    container.addEventListener('dragover', handleNativeDragOver, true);
    container.addEventListener('dragleave', handleNativeStop, true);
    container.addEventListener('drop', handleNativeStop, true);
    container.addEventListener('dragend', handleNativeStop, true);

    return () => {
      container.removeEventListener('dragover', handleNativeDragOver, true);
      container.removeEventListener('dragleave', handleNativeStop, true);
      container.removeEventListener('drop', handleNativeStop, true);
      container.removeEventListener('dragend', handleNativeStop, true);
    };
  }, [containerRef, threshold, speed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stop();
  }, []);

  return { onDragOver, onDragLeave, onDrop };
}
