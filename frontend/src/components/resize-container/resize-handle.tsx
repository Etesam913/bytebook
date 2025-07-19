import { type MotionValue, motion } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import type { Dispatch, MouseEvent, RefObject, SetStateAction } from 'react';
import { draggedElementAtom, noteContainerRefAtom } from '../editor/atoms';
import type { ResizeWidth } from '../../types';
import { dragItem } from '../../utils/draggable';

const RIGHT_BOUNDARY = 45;

interface ResizeHandleProps {
  ref: RefObject<HTMLElement | null>;
  resizeWidthMotionValue: MotionValue<number | '100%'>;
  resizeHeightMotionValue: MotionValue<number | '100%'>;
  widthMotionValue: MotionValue<number | '100%'>;
  writeWidthToNode: (width: ResizeWidth) => void;
  setIsResizing: Dispatch<SetStateAction<boolean>>;
  setSelected: (arg0: boolean) => void;
}

export function ResizeHandle({
  ref,
  resizeWidthMotionValue,
  resizeHeightMotionValue,
  widthMotionValue,
  writeWidthToNode,
  setIsResizing,
  setSelected,
}: ResizeHandleProps) {
  const noteContainerRef = useAtomValue(noteContainerRefAtom);
  const setDraggedElement = useSetAtom(draggedElementAtom);
  // The component has no background-color as there is a copy of this in the parent component that follows the resize outline
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      className={
        'w-7 h-7 bottom-[-7px] right-[-6px] absolute cursor-nwse-resize rounded-xs z-10'
      }
      // onMouseUp={(e: MouseEvent<HTMLDivElement>) => {
      // 	e.stopPropagation();
      // 	setSelected(true);
      // }}
      onClick={(e: MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setSelected(true);
      }}
      onMouseDown={(mouseDownEvent: MouseEvent<HTMLDivElement>) => {
        setIsResizing(true);
        mouseDownEvent.stopPropagation();
        setDraggedElement(mouseDownEvent.target as HTMLElement);
        dragItem(
          (dragEvent) => {
            const mouseDownBox = mouseDownEvent.target as HTMLDivElement;
            const mouseDownBoxRect = mouseDownBox.getBoundingClientRect();
            const widthDiff = mouseDownBoxRect.right - dragEvent.clientX;
            const heightDiff = mouseDownBoxRect.bottom - dragEvent.clientY;

            // Early exit if ref.current is not defined
            if (!ref.current) {
              return;
            }

            document.body.style.cursor = 'nwse-resize';

            const isWidthSmaller = widthDiff < heightDiff;

            let newWidth = 0;
            let newHeight = 0;
            const noteContainerWidth =
              (noteContainerRef?.current?.clientWidth ?? 0) - RIGHT_BOUNDARY;

            if (isWidthSmaller) {
              // Calculate new width based on width difference
              newWidth = Math.min(
                Math.max(160, Math.round(ref.current.clientWidth - widthDiff)),
                noteContainerWidth
              );
              newHeight = Math.round(
                newWidth * (ref.current.clientHeight / ref.current.clientWidth)
              );
            } else {
              // Calculate new height and adjust width to maintain aspect ratio
              newHeight = ref.current.clientHeight - heightDiff;
              newWidth = Math.min(
                Math.max(
                  160,
                  Math.round(
                    newHeight *
                      (ref.current.clientWidth / ref.current.clientHeight)
                  )
                ),
                noteContainerWidth
              );
              // Recalculate newHeight as the width could have changed to 160
              newHeight = Math.round(
                newWidth * (ref.current.clientHeight / ref.current.clientWidth)
              );
            }
            // Update the width through the motion value
            resizeWidthMotionValue.set(newWidth);
            resizeHeightMotionValue.set(newHeight);
          },

          () => {
            document.body.style.cursor = '';
            widthMotionValue.set(resizeWidthMotionValue.get());
            setTimeout(() => {
              writeWidthToNode(widthMotionValue.get());
            }, 100);
            setTimeout(() => {
              setDraggedElement(null);
            }, 1000);
          }
        );
      }}
    />
  );
}
