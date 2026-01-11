import type { MotionValue } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useRef, useState } from 'react';
import { draggedGhostElementAtom } from '../editor/atoms';
import { dragItem } from '../../utils/draggable';
import { MAX_SIDEBAR_WIDTH } from '../../utils/general';
import { cn } from '../../utils/string-formatting';
import { currentZoomAtom } from '../../hooks/resize';

const MIN_SIDEBAR_WIDTH = 250;
export function Spacer({ width }: { width: MotionValue<number> }) {
  const setDraggedGhostElement = useSetAtom(draggedGhostElementAtom);
  const currentZoom = useAtomValue(currentZoomAtom);
  const [isDragged, setIsDragged] = useState(false);
  const dragStartClientXRef = useRef<number | null>(null);
  const dragStartWidthRef = useRef<number | null>(null);

  const handleDragStart = () => {
    setIsDragged(true);
    document.body.classList.add('bb-force-grabbing');
    document.body.style.cursor = 'grabbing';
  };

  const handleDragEnd = () => {
    setIsDragged(false);
    setDraggedGhostElement(null);
    document.body.classList.remove('bb-force-grabbing');
    document.body.style.cursor = '';
    dragStartClientXRef.current = null;
    dragStartWidthRef.current = null;
  };

  const handleDrag = (e: MouseEvent) => {
    // Account for zoom by dividing clientX by current zoom level
    const adjustedClientX = e.clientX / currentZoom;
    const dragStartClientX = dragStartClientXRef.current ?? adjustedClientX;
    const dragStartWidth = dragStartWidthRef.current ?? width.get();
    const delta = adjustedClientX - dragStartClientX;
    const newWidth = dragStartWidth + delta;

    // Clamp width between min and max values
    const clampedWidth = Math.max(
      Math.min(newWidth, MAX_SIDEBAR_WIDTH),
      MIN_SIDEBAR_WIDTH
    );
    width.set(clampedWidth);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const adjustedClientX = e.clientX / currentZoom;
    dragStartClientXRef.current = adjustedClientX;
    dragStartWidthRef.current = width.get();
    handleDragStart();
    setDraggedGhostElement(e.target as HTMLElement);
    dragItem(handleDrag, handleDragEnd);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'w-[6px] border-l transition-all duration-200 ease-in-out',
        isDragged
          ? 'border-(--accent-color) border-l-3'
          : 'border-l-zinc-200 dark:border-l-zinc-700 hover:border-l-(--accent-color)! hover:border-l-2 hover:cursor-grab'
      )}
    />
  );
}
