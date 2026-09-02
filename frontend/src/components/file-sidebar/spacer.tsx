import type { MotionValue } from 'motion/react';
import { useSetAtom } from 'jotai';
import { useRef, useState } from 'react';
import { useMove } from 'react-aria';
import { draggedGhostElementAtom } from '@components/editor/atoms';
import { MAX_SIDEBAR_WIDTH } from '@utils/general';
import { cn } from '@utils/string-formatting';

const MIN_SIDEBAR_WIDTH = 265;
const KEYBOARD_STEP = 16;

export function Spacer({ width }: { width: MotionValue<number> }) {
  const setDraggedGhostElement = useSetAtom(draggedGhostElementAtom);
  const [isDragged, setIsDragged] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);

  const { moveProps } = useMove({
    onMoveStart: (e) => {
      if (e.pointerType === 'keyboard') return;
      setIsDragged(true);
      setDraggedGhostElement(handleRef.current);
      document.body.classList.add('bb-force-grabbing');
      document.body.style.cursor = 'grabbing';
    },
    onMove: (e) => {
      const delta =
        e.pointerType === 'keyboard'
          ? Math.sign(e.deltaX) * KEYBOARD_STEP
          : e.deltaX;
      width.set(
        Math.max(
          Math.min(width.get() + delta, MAX_SIDEBAR_WIDTH),
          MIN_SIDEBAR_WIDTH
        )
      );
    },
    onMoveEnd: () => {
      setIsDragged(false);
      setDraggedGhostElement(null);
      document.body.classList.remove('bb-force-grabbing');
      document.body.style.cursor = '';
    },
  });

  return (
    <div
      {...moveProps}
      ref={handleRef}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={MIN_SIDEBAR_WIDTH}
      aria-valuemax={MAX_SIDEBAR_WIDTH}
      tabIndex={0}
      className={cn(
        'w-[0.375rem] border-l outline-none focus-visible:border-l-(--accent-color)! focus-visible:border-l-2',
        isDragged
          ? 'border-(--accent-color) border-l-3 pointer-events-none'
          : 'border-l-zinc-200 dark:border-l-zinc-700 hover:border-l-(--accent-color)! hover:border-l-2 hover:cursor-grab'
      )}
    />
  );
}
