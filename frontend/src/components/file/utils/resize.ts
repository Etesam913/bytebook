import type { MotionValue } from 'motion/react';
import { useRef } from 'react';
import { useMove } from 'react-aria';
import type { FileDimensions } from '@components/editor/nodes/types';

export const MIN_WIDTH = 64;
const KEYBOARD_STEP = 16;

/**
 * Writes dimensions to the node for either a video or image element.
 * Uses intrinsic dimensions (videoWidth/videoHeight for video, naturalWidth/naturalHeight for image)
 * because the element may still be hidden (display: none) when the load event fires.
 * If height is undefined, calculates it from the aspect ratio of the intrinsic dimensions.
 */
export function writeMediaDimensionsOnLoad(
  element: HTMLVideoElement | HTMLImageElement,
  dimensionsWrittenToNode: FileDimensions,
  writeDimensionsToNode: (dimensions: FileDimensions) => void
): void {
  // Get intrinsic dimensions based on element type
  const intrinsicWidth =
    element instanceof HTMLVideoElement
      ? element.videoWidth || element.clientWidth || 0
      : element.naturalWidth || element.clientWidth || 0;

  const intrinsicHeight =
    element instanceof HTMLVideoElement
      ? element.videoHeight || element.clientHeight || 0
      : element.naturalHeight || element.clientHeight || 0;

  // If height is undefined, calculate it from aspect ratio
  if (dimensionsWrittenToNode.height === undefined) {
    const aspectRatio = intrinsicWidth / intrinsicHeight;
    // To get height from width: height = width / aspectRatio
    const newHeight = Math.round(dimensionsWrittenToNode.width / aspectRatio);

    writeDimensionsToNode({
      width: dimensionsWrittenToNode.width,
      height: newHeight,
    });
  }
}

/** useMove handlers that resize the media element by pointer or arrow keys and commit on move end. */
export function useMediaResizeMove({
  elementRef,
  handleRef,
  noteContainerRef,
  widthMotionValue,
  writeDimensionsToNode,
  setDraggedGhostElement,
}: {
  elementRef: React.RefObject<HTMLElement | null>;
  handleRef: React.RefObject<HTMLElement | null>;
  noteContainerRef: React.RefObject<HTMLElement | null> | null;
  widthMotionValue: MotionValue<number>;
  writeDimensionsToNode: (dimensions: FileDimensions) => void;
  setDraggedGhostElement: (element: HTMLElement | null) => void;
}) {
  // Captured on move start; the element is not measured on every delta.
  const aspectRatioRef = useRef(1);
  return useMove({
    onMoveStart(e) {
      const elementBox = elementRef.current;
      if (!elementBox) return;
      aspectRatioRef.current = elementBox.clientHeight / elementBox.clientWidth;
      if (e.pointerType !== 'keyboard') {
        document.body.style.cursor = 'sw-resize';
        setDraggedGhostElement(handleRef.current);
      }
    },
    onMove(e) {
      const maxWidth = noteContainerRef?.current?.clientWidth ?? Infinity;
      const delta =
        e.pointerType === 'keyboard'
          ? Math.sign(e.deltaX) * KEYBOARD_STEP
          : e.deltaX;
      widthMotionValue.set(
        Math.max(MIN_WIDTH, Math.min(widthMotionValue.get() + delta, maxWidth))
      );
    },
    onMoveEnd() {
      document.body.style.cursor = '';
      const newWidth = widthMotionValue.get();
      writeDimensionsToNode({
        width: Math.round(newWidth),
        height: Math.round(newWidth * aspectRatioRef.current),
      });
      setDraggedGhostElement(null);
    },
  });
}
