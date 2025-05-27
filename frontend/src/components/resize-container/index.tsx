import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AnimatePresence, motion, useMotionValue } from 'motion/react';
import { type KeyboardEvent, type ReactNode, RefObject, useRef } from 'react';
import type { ResizeState, ResizeWidth } from '../../types';
import { cn } from '../../utils/string-formatting';
import { useTrapFocus } from '../dialog/hooks';
import { ResizeControls } from './resize-controls';
import { ResizeHandle } from './resize-handle';
import { expandNearestSiblingNode } from './utils';

export function ResizeContainer({
  resizeState,
  children,
  nodeKey,
  defaultWidth,
  writeWidthToNode,
  ref,
  shouldHeightMatchWidth,
  src,
  elementType,
}: {
  resizeState: ResizeState;
  children: ReactNode;
  nodeKey: string;
  ref: RefObject<HTMLElement | null>;
  defaultWidth: ResizeWidth;
  writeWidthToNode: (width: ResizeWidth) => void;
  shouldHeightMatchWidth?: boolean;
  src: string;
  elementType: 'image' | 'video';
}) {
  const widthMotionValue = useMotionValue<number | '100%'>(defaultWidth);
  const resizeWidthMotionValue = useMotionValue<number | '100%'>(
    widthMotionValue.get()
  );
  const resizeHeightMotionValue = useMotionValue<number | '100%'>('100%');

  const {
    isSelected,
    isExpanded,
    setIsExpanded,
    isResizing,
    setIsResizing,
    setSelected,
  } = resizeState;

  const expandedResizeContainerRef = useRef<HTMLDivElement>(null);
  const [editor] = useLexicalComposerContext();

  useTrapFocus(expandedResizeContainerRef, isExpanded);

  return (
    <>
      <motion.div
        ref={expandedResizeContainerRef}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Escape' && isExpanded) {
            setIsExpanded(false);
            e.stopPropagation();
          }
          if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && isExpanded) {
            e.preventDefault();
            e.stopPropagation();
            const isExpandableNeighbor = expandNearestSiblingNode(
              editor,
              nodeKey,
              setIsExpanded,
              e.key === 'ArrowRight' ? 'right' : 'left'
            );

            if (isExpandableNeighbor && ref.current?.tagName === 'VIDEO') {
              (ref.current as HTMLVideoElement).pause();
            }
          }
        }}
        tabIndex={isExpanded ? 0 : -1}
        // onClick={(e: MouseEvent) => isExpanded && e.stopPropagation()}
        className={cn(
          'relative rounded-xs outline-hidden max-w-full',
          isExpanded &&
            'max-h-screen fixed top-0 left-0 right-0 bottom-0 z-45 m-auto flex justify-start overflow-auto'
        )}
        style={{
          width: !isExpanded ? widthMotionValue : '100%',
          height: shouldHeightMatchWidth ? widthMotionValue : 'auto',
          transition: 'outline 0.2s ease-in-out, opacity 0.2s ease-in-out',
        }}
      >
        <AnimatePresence>
          {isSelected && !isExpanded && (
            <>
              <motion.span
                className={cn(
                  'absolute z-20 h-full w-full border-4 border-(--accent-color) rounded-xs pointer-events-none',
                  !isResizing && 'max-w-full'
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  width: resizeWidthMotionValue,
                  height: resizeHeightMotionValue,
                }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.25 } }}
                  className={
                    'w-4 h-4 bg-(--accent-color) bottom-[-10px] right-[-9px] absolute cursor-nwse-resize rounded-xs pointer-events-none'
                  }
                />
              </motion.span>
              <ResizeControls
                src={src}
                nodeKey={nodeKey}
                motionValues={{
                  widthMotionValue,
                  resizeWidthMotionValue,
                  resizeHeightMotionValue,
                }}
                writeWidthToNode={writeWidthToNode}
                elementType={elementType}
              />
              <ResizeHandle
                ref={ref}
                resizeWidthMotionValue={resizeWidthMotionValue}
                resizeHeightMotionValue={resizeHeightMotionValue}
                widthMotionValue={widthMotionValue}
                writeWidthToNode={writeWidthToNode}
                setIsResizing={setIsResizing}
                setSelected={setSelected}
              />
            </>
          )}
        </AnimatePresence>
        {children}
      </motion.div>
    </>
  );
}
