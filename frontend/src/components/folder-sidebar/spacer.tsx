import type { MotionValue } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import { draggedElementAtom } from '../editor/atoms';
import { dragItem } from '../../utils/draggable';
import { MAX_SIDEBAR_WIDTH } from '../../utils/general';
import { cn } from '../../utils/string-formatting';
import { currentZoomAtom } from '../../hooks/resize';

const MIN_SIDEBAR_WIDTH = 250;
const SPACER_OFFSET = 8;

export function Spacer({
  width,
  leftWidth,
  spacerConstant = SPACER_OFFSET,
}: {
  width: MotionValue<number>;
  leftWidth?: MotionValue<number>;
  spacerConstant?: number;
}) {
  const setDraggedElement = useSetAtom(draggedElementAtom);
  const currentZoom = useAtomValue(currentZoomAtom);
  const [isDragged, setIsDragged] = useState(false);

  const handleDragStart = () => {
    setIsDragged(true);
  };

  const handleDragEnd = () => {
    setIsDragged(false);
    setDraggedElement(null);
  };

  const handleDrag = (e: MouseEvent) => {
    // Account for zoom by dividing clientX by current zoom level
    const adjustedClientX = e.clientX / currentZoom;
    const leftOffset = leftWidth ? leftWidth.get() + spacerConstant : 0;
    const newWidth = adjustedClientX - leftOffset;

    // Clamp width between min and max values
    const clampedWidth = Math.max(
      Math.min(newWidth, MAX_SIDEBAR_WIDTH),
      MIN_SIDEBAR_WIDTH
    );
    width.set(clampedWidth);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    handleDragStart();
    setDraggedElement(e.target as HTMLElement);
    dragItem(handleDrag, handleDragEnd);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'w-[6px] cursor-ew-resize border-l-[1px] transition-all duration-200 ease-in-out',
        isDragged
          ? 'border-(--accent-color) border-l-2'
          : 'border-l-zinc-200 dark:border-l-zinc-700 hover:border-l-(--accent-color)'
      )}
    />
  );
}
