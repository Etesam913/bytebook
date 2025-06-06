import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { useAtom, useAtomValue } from 'jotai';
import { RefObject, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  draggedElementAtom,
  isNoteMaximizedAtom,
  noteContainerRefAtom,
} from '../../../atoms';
import { VerticalDots } from '../../../icons/vertical-dots';

import { useDraggableBlock, useNodeDragEvents } from '../hooks/draggable-block';
import { handleDragStart, setHandlePosition } from '../utils/draggable-block';

export function DraggableBlockPlugin({
  overflowContainerRef,
}: {
  overflowContainerRef: RefObject<HTMLDivElement | null>;
}) {
  const [editor] = useLexicalComposerContext();
  const { draggableBlockElement } = useDraggableBlock(overflowContainerRef);
  const noteContainerRef = useAtomValue(noteContainerRefAtom);
  const [isDragHandleShowing, setIsDragHandleShowing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const [draggedElement, setDraggedElement] = useAtom(draggedElementAtom);

  const dragHandleYMotionValue = useMotionValue(0);
  const dragHandleYSpringMotionValue = useSpring(dragHandleYMotionValue, {
    damping: 12,
    stiffness: 170,
    mass: 0.05,
    restDelta: 0.5,
    restSpeed: 0.5,
  });

  const targetLineYMotionValue = useMotionValue(0);
  const targetLineYSpringMotionValue = useSpring(targetLineYMotionValue, {
    damping: 16,
    stiffness: 200,
    mass: 0.03,
    restDelta: 0.5,
    restSpeed: 0.5,
  });

  useNodeDragEvents(
    editor,
    isDragging,
    noteContainerRef,
    targetLineYMotionValue
  );

  useEffect(() => {
    if (handleRef.current && noteContainerRef?.current) {
      setHandlePosition(
        draggableBlockElement,
        handleRef.current,
        noteContainerRef.current,
        setIsDragHandleShowing,
        dragHandleYMotionValue
      );
    }
  }, [noteContainerRef, draggableBlockElement, handleRef]);

  if (!noteContainerRef?.current) return <></>;

  return createPortal(
    <>
      <motion.div
        draggable
        onDragStart={(e: DragEvent) =>
          handleDragStart(
            e,
            editor,
            setIsDragging,
            draggableBlockElement,
            setDraggedElement,
            noteContainerRef.current
          )
        }
        onDragEnd={() => {
          setIsDragging(false);
          setDraggedElement(null);
          // Remove the ghost drag element. It is not needed anymore.
          if (draggedElement) draggedElement.remove();
        }}
        animate={{
          opacity: isDragHandleShowing ? 1 : 0,
        }}
        style={{ x: isNoteMaximized ? 5 : -2, y: dragHandleYSpringMotionValue }}
        className="draggable-block-menu text-zinc-500 dark:text-zinc-300"
        ref={handleRef}
      >
        <VerticalDots height="15px" width="15px" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        style={{ y: targetLineYSpringMotionValue }}
        animate={{ opacity: isDragging ? 1 : 0 }}
        id="target-line"
        className="absolute pointer-events-none bg-(--accent-color) ml-4 w-[calc(100%-2.25rem)] h-[3px] rounded-full left-0 top-0 will-change-transform"
      />
    </>,
    noteContainerRef.current
  );
}
