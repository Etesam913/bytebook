import type { MotionValue } from 'motion/react';
import { useSetAtom } from 'jotai';
import { useState } from 'react';
import { draggedElementAtom } from '../editor/atoms';
import { dragItem } from '../../utils/draggable';
import { MAX_SIDEBAR_WIDTH } from '../../utils/general';
import { cn } from '../../utils/string-formatting';

export function Spacer({
  width,
  leftWidth,
  spacerConstant = 8,
}: {
  width: MotionValue<number>;
  leftWidth?: MotionValue<number>;
  spacerConstant?: number;
}) {
  const setDraggedElement = useSetAtom(draggedElementAtom);
  const [isDragged, setIsDragged] = useState(false);

  return (
    <div
      onMouseDown={(e) => {
        setIsDragged(true);
        setDraggedElement(e.target as HTMLElement);
        dragItem(
          (e) => {
            width.set(
              Math.min(
                Math.max(
                  MAX_SIDEBAR_WIDTH,
                  e.clientX - (leftWidth ? leftWidth.get() + spacerConstant : 0)
                ),
                325
              )
            );
          },
          () => {
            setIsDragged(false);
            setDraggedElement(null);
          }
        );
      }}
      className={cn(
        'w-[6px] cursor-ew-resize border-l-[1px] transition-all duration-200 ease-in-out',
        isDragged
          ? 'border-(--accent-color) border-l-2'
          : 'border-l-zinc-200 dark:border-l-zinc-700 hover:border-l-(--accent-color)'
      )}
    />
  );
}
