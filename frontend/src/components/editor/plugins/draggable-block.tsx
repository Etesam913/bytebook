import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  motion,
  useMotionValue,
  useSpring,
  type MotionValue,
} from 'motion/react';
import { useAtom, useAtomValue } from 'jotai';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { LexicalEditor } from 'lexical';

import { draggedGhostElementAtom, noteContainerRefAtom } from '../atoms';
import { VerticalDots } from '../../../icons/vertical-dots';
import { useDraggableBlock, useNodeDragEvents } from '../hooks/draggable-block';
import { handleDragStart, setHandlePosition } from '../utils/draggable-block';
import { useRefState } from '../hooks/ref-state';
import { FILE_TREE_GHOST_ID } from '../../virtualized/virtualized-file-tree/utils/drag';

/** Motion values that position the custom vertical caret shown during file-tree drags. */
type FileTreeDropCaretMotionValues = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  height: MotionValue<number>;
  opacity: MotionValue<number>;
};

function useFileTreeDropCaretMotion(): FileTreeDropCaretMotionValues {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const height = useMotionValue(20);
  const opacity = useMotionValue(0);
  return { x, y, height, opacity };
}

export function DraggableBlockPlugin({
  overflowContainerRef,
}: {
  overflowContainerRef: RefObject<HTMLDivElement | null>;
}) {
  const [editor] = useLexicalComposerContext();
  const { draggableBlockElement } = useDraggableBlock(overflowContainerRef);
  const noteContainerRef = useAtomValue(noteContainerRefAtom);
  const noteContainerElement = useRefState(noteContainerRef);

  const [isDragHandleShowing, setIsDragHandleShowing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragHandleY = useMotionValue(0);
  const dragHandleYSpring = useSpring(dragHandleY, {
    damping: 12,
    stiffness: 170,
    mass: 0.05,
    restDelta: 0.5,
    restSpeed: 0.5,
  });

  const targetLineY = useMotionValue(0);
  const targetLineYSpring = useSpring(targetLineY, {
    damping: 16,
    stiffness: 200,
    mass: 0.03,
    restDelta: 0.5,
    restSpeed: 0.5,
  });

  const fileTreeDropCaret = useFileTreeDropCaretMotion();

  useNodeDragEvents({
    editor,
    isEditorContentDragging: isDragging,
    noteContainerRef,
    targetLineYMotionValue: targetLineY,
    fileTreeDropCaret,
  });

  if (!noteContainerElement) return null;

  return createPortal(
    <>
      <DragHandle
        editor={editor}
        draggableBlockElement={draggableBlockElement}
        noteContainerElement={noteContainerElement}
        isShowing={isDragHandleShowing}
        setIsShowing={setIsDragHandleShowing}
        setIsDragging={setIsDragging}
        dragHandleY={dragHandleY}
        dragHandleYSpring={dragHandleYSpring}
        targetLineY={targetLineY}
      />
      <BlockTargetLine ySpring={targetLineYSpring} isVisible={isDragging} />
      <FileTreeDropCaret motionValues={fileTreeDropCaret} />
    </>,
    noteContainerElement
  );
}

function DragHandle({
  editor,
  draggableBlockElement,
  noteContainerElement,
  isShowing,
  setIsShowing,
  setIsDragging,
  dragHandleY,
  dragHandleYSpring,
  targetLineY,
}: {
  editor: LexicalEditor;
  draggableBlockElement: HTMLElement | null;
  noteContainerElement: HTMLElement;
  isShowing: boolean;
  setIsShowing: Dispatch<SetStateAction<boolean>>;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  dragHandleY: MotionValue<number>;
  dragHandleYSpring: MotionValue<number>;
  targetLineY: MotionValue<number>;
}) {
  const handleRef = useRef<HTMLDivElement>(null);
  const [draggedGhostElement, setDraggedGhostElement] = useAtom(
    draggedGhostElementAtom
  );

  useEffect(() => {
    if (!handleRef.current) return;
    setHandlePosition({
      draggableBlockElement,
      handle: handleRef.current,
      noteContainer: noteContainerElement,
      setIsHandleShowing: setIsShowing,
      yMotionValue: dragHandleY,
    });
  }, [noteContainerElement, draggableBlockElement, dragHandleY, setIsShowing]);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label="Drag to reorder block"
      draggable
      ref={handleRef}
      onDragStart={(e: DragEvent) => {
        // Initialize target line position to match drag handle position so the
        // indicator doesn't flash in from y=0.
        targetLineY.set(dragHandleY.get());
        handleDragStart({
          e,
          editor,
          setIsDragging,
          draggableBlockElement,
          setDraggedGhostElement,
          noteContainer: noteContainerElement,
        });
      }}
      onDragEnd={() => {
        setIsDragging(false);
        setDraggedGhostElement(null);
        draggedGhostElement?.remove();
      }}
      animate={{ opacity: isShowing ? 1 : 0 }}
      style={{ x: -30, y: dragHandleYSpring }}
      className="draggable-block-menu text-zinc-500 dark:text-zinc-300"
    >
      <VerticalDots height="15px" width="15px" />
    </motion.div>
  );
}

function BlockTargetLine({
  ySpring,
  isVisible,
}: {
  ySpring: MotionValue<number>;
  isVisible: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      style={{ y: ySpring }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      id="target-line"
      className="absolute pointer-events-none bg-(--accent-color) w-full h-[3px] rounded-full left-0 top-0 will-change-transform"
    />
  );
}

function FileTreeDropCaret({
  motionValues,
}: {
  motionValues: FileTreeDropCaretMotionValues;
}) {
  const draggedGhostElement = useAtomValue(draggedGhostElementAtom);

  // Hide the caret whenever we're not dragging something from the file tree.
  // This also fires on file-tree `dragend` (ghost -> null) to clean up after a
  // successful drop. External OS file drags keep the ghost `null` throughout,
  // so this effect doesn't re-run during them; their caret visibility is
  // driven by the Wails `handleDragOver` wrapper in `useNodeDragEvents`.
  useEffect(() => {
    if (draggedGhostElement?.id !== FILE_TREE_GHOST_ID) {
      motionValues.opacity.set(0);
    }
  }, [draggedGhostElement, motionValues.opacity]);

  return (
    <motion.div
      aria-hidden
      id="file-tree-drop-caret"
      style={{
        x: motionValues.x,
        y: motionValues.y,
        height: motionValues.height,
        opacity: motionValues.opacity,
        width: 2,
        left: 0,
        top: 0,
      }}
      className="absolute pointer-events-none z-[5] rounded-sm bg-(--accent-color) will-change-transform"
    />
  );
}
