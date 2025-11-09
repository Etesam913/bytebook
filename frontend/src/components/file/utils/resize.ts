import type { MotionValue } from 'motion/react';
import { dragItem } from '../../../utils/draggable';
import type { FileDimensions } from '../../editor/nodes/types';

const MIN_WIDTH = 64;

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

export function onResize(
  mouseDownEvent: React.MouseEvent<HTMLDivElement>,
  {
    elementRef,
    noteContainerRef,
    widthMotionValue,
    writeDimensionsToNode,
    setDraggedGhostElement,
  }: {
    elementRef: React.RefObject<HTMLElement | null>;
    noteContainerRef: React.RefObject<HTMLElement | null> | null;
    widthMotionValue: MotionValue<number>;
    writeDimensionsToNode: (dimensions: FileDimensions) => void;
    setDraggedGhostElement: (element: HTMLElement | null) => void;
  }
) {
  document.body.style.cursor = 'sw-resize';
  const elementBox = elementRef.current;
  const noteContainer = noteContainerRef?.current;
  if (!elementBox || !noteContainer) return;

  const aspectRatio = elementBox.clientHeight / elementBox.clientWidth;

  mouseDownEvent.stopPropagation();
  setDraggedGhostElement(mouseDownEvent.target as HTMLElement);
  dragItem(
    (dragEvent) => {
      const mouseDownBox = mouseDownEvent.target as HTMLDivElement;
      const mouseDownBoxRect = mouseDownBox.getBoundingClientRect();

      const widthDiff = dragEvent.clientX - mouseDownBoxRect.right;

      const outlineBoxWidth = elementBox.clientWidth + widthDiff;

      widthMotionValue.set(
        Math.max(
          MIN_WIDTH,
          Math.min(outlineBoxWidth, noteContainer.clientWidth)
        )
      );
    },

    () => {
      document.body.style.cursor = '';

      const newWidth = widthMotionValue.get();
      writeDimensionsToNode({
        width: Math.round(newWidth),
        height: Math.round(newWidth * aspectRatio),
      });
      setDraggedGhostElement(null);
    }
  );
}
