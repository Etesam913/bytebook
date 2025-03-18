import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AnimatePresence, motion, useMotionValue } from 'framer-motion';
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  RefObject,
  useEffect,
  useRef,
} from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { CircleArrowLeft } from '../../icons/circle-arrow-left';
import { CircleArrowRight } from '../../icons/circle-arrow-right';
import { XMark } from '../../icons/circle-xmark';
import type { ResizeState, ResizeWidth } from '../../types';
import { cn } from '../../utils/string-formatting';
import { useTrapFocus } from '../dialog/hooks';
import { ResizeControls } from './resize-controls';
import { ResizeHandle } from './resize-handle';
import { expandNearestSiblingNode, useMouseActivity } from './utils';

export function ResizeContainer({
  resizeState,
  children,
  nodeKey,
  defaultWidth,
  writeWidthToNode,
  elementType,
  ref,
  shouldHeightMatchWidth,
  src,
}: {
  resizeState: ResizeState;
  children: ReactNode;
  nodeKey: string;
  ref: RefObject<HTMLElement | null>;
  defaultWidth: ResizeWidth;
  writeWidthToNode: (width: ResizeWidth) => void;
  elementType: 'default' | 'excalidraw';
  shouldHeightMatchWidth?: boolean;
  src: string;
}) {
  const widthMotionValue = useMotionValue<number | '100%'>(defaultWidth);
  const resizeWidthMotionValue = useMotionValue<number | '100%'>(
    widthMotionValue.get()
  );
  const resizeHeightMotionValue = useMotionValue<number | '100%'>('100%');

  const { isSelected, isExpanded, setIsExpanded, setIsResizing, setSelected } =
    resizeState;

  const resizeContainerRef = useRef<HTMLDivElement>(null);
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (isExpanded) {
      resizeContainerRef.current?.focus();
    }
  }, [isExpanded]);

  useTrapFocus(resizeContainerRef, isExpanded);
  const shouldUseMouseActivity = useMouseActivity(1500, isExpanded);
  const isLeftAndRightArrowKeysShowing =
    elementType !== 'excalidraw' && shouldUseMouseActivity;

  return (
    <>
      <motion.div
        ref={resizeContainerRef}
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
          'relative inline-block rounded-xs outline-hidden max-w-full',
          isExpanded &&
            'max-h-screen fixed top-0 left-0 right-0 bottom-0 z-45 m-auto flex justify-start overflow-auto',
          isExpanded && elementType === 'excalidraw' && 'h-screen!'
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
                className="absolute max-w-full z-20 h-full w-full border-[4px] border-(--accent-color) rounded-xs pointer-events-none"
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
                resizeState={resizeState}
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
      {isExpanded && (
        <>
          <div
            onClick={() => setIsExpanded(false)}
            className="fixed z-40 w-screen h-screen bg-black left-0 top-0"
          />
          <motion.button
            {...getDefaultButtonVariants()}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              setIsExpanded(false);
              e.stopPropagation();
            }}
            className="fixed z-50 right-5 top-4 bg-[rgba(0,0,0,0.55)] text-white p-1 rounded-full"
            type="submit"
          >
            <XMark width={24} height={24} />
          </motion.button>

          <AnimatePresence initial={false}>
            {isLeftAndRightArrowKeysShowing && (
              <>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  {...getDefaultButtonVariants()}
                  onClick={() => {
                    const isExpandableNeighbor = expandNearestSiblingNode(
                      editor,
                      nodeKey,
                      setIsExpanded,
                      'left'
                    );
                    if (
                      isExpandableNeighbor &&
                      ref.current?.tagName === 'VIDEO'
                    ) {
                      (ref.current as HTMLVideoElement).pause();
                    }
                  }}
                  className="fixed z-50 bottom-11 left-[40%] bg-[rgba(0,0,0,0.55)] text-white p-1 rounded-full"
                  type="submit"
                >
                  <CircleArrowLeft width={28} height={28} />
                </motion.button>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  {...getDefaultButtonVariants()}
                  onClick={() => {
                    const isExpandableNeighbor = expandNearestSiblingNode(
                      editor,
                      nodeKey,
                      setIsExpanded,
                      'right'
                    );
                    if (
                      isExpandableNeighbor &&
                      ref.current?.tagName === 'VIDEO'
                    ) {
                      (ref.current as HTMLVideoElement).pause();
                    }
                  }}
                  className="fixed z-50 bottom-11 right-[40%] bg-[rgba(0,0,0,0.55)] text-white p-1 rounded-full"
                  type="submit"
                >
                  <CircleArrowRight width={28} height={28} />
                </motion.button>
              </>
            )}
          </AnimatePresence>
          {/* Prevents a bug where the resize container size is like 8x8 after leaving fullscreen for videos */}
          <div
            style={{
              width: 0,
              height: 0,
            }}
          />
        </>
      )}
    </>
  );
}
