import { useAtomValue, useSetAtom } from 'jotai/react';
import type { ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  noteContainerRefAtom,
  noteSeenFileNodeKeysAtom,
} from '@components/editor/atoms';
import { useShowWhenInViewport } from '@hooks/observers';
import { AnimatePresence, motion, useMotionValue } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { draggedGhostElementAtom } from '@components/editor/atoms';
import { FileError } from '../error';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import type { FileDimensions } from '@components/editor/nodes/types';
import {
  MIN_WIDTH,
  useMediaResizeMove,
  writeMediaDimensionsOnLoad,
} from '../utils/resize';
import { FilePlaceholder } from '../placeholder';
import { createFilePath } from '@utils/path';
import { SelectionHighlight } from '@components/selection-highlight';
import { contextMenuDataAtom } from '@/atoms';
import { removeDecoratorNode } from '@utils/commands';
import { Link } from '@/icons/link';
import { Trash } from '@/icons/trash';
import { Maximize } from '@/icons/maximize';
import { $getNodeByKey, $getSelection, HISTORY_PUSH_TAG } from 'lexical';
import { $isFileNode } from '@components/editor/nodes/file';
import { Browser } from '@wailsio/runtime';
import { navigate } from 'wouter/use-browser-location';
import {
  MenuItemLabel,
  useContextMenuItems,
} from '@components/context-menu/items';

type MediaRenderProps = {
  mediaRef: RefObject<HTMLElement | null>;
  widthMotionValue: MotionValue<number>;
  onMediaLoaded: () => void;
  onMediaError: () => void;
  isLoading: boolean;
  src: string;
};

export function MediaContainer({
  src,
  dimensionsWrittenToNode,
  writeDimensionsToNode,
  nodeKey,
  resizeAriaLabel,
  children,
}: {
  src: string;
  dimensionsWrittenToNode: FileDimensions;
  writeDimensionsToNode: (dimensions: FileDimensions) => void;
  nodeKey: string;
  resizeAriaLabel: string;
  children: (props: MediaRenderProps) => ReactNode;
}) {
  const [editor] = useLexicalComposerContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const noteSeenFileNodeKeys = useAtomValue(noteSeenFileNodeKeysAtom);
  const [isSelected] = useLexicalNodeSelection(nodeKey);
  const isInViewport = noteSeenFileNodeKeys.has(nodeKey);
  const setDraggedGhostElement = useSetAtom(draggedGhostElementAtom);
  const noteContainerRef = useAtomValue(noteContainerRefAtom);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const { revealInFinder } = useContextMenuItems();

  // External files start with http
  const isALocalFile = src.startsWith('/notes/');

  useShowWhenInViewport(loaderRef);

  const widthMotionValue = useMotionValue<number>(
    dimensionsWrittenToNode.width
  );
  // Menu actions and undo update the node without going through the resize handle.
  useEffect(() => {
    widthMotionValue.set(dimensionsWrittenToNode.width);
  }, [dimensionsWrittenToNode.width, widthMotionValue]);
  const { moveProps } = useMediaResizeMove({
    elementRef: mediaRef,
    handleRef: resizeHandleRef,
    noteContainerRef,
    widthMotionValue,
    writeDimensionsToNode,
    setDraggedGhostElement,
  });

  // Mirror the live width onto the slider without re-rendering on every frame.
  useEffect(
    () =>
      widthMotionValue.on('change', (width) => {
        resizeHandleRef.current?.setAttribute(
          'aria-valuenow',
          String(Math.round(width))
        );
      }),
    [widthMotionValue]
  );

  if (isError) {
    return <FileError src={src} nodeKey={nodeKey} type="loading-fail" />;
  }

  const placeholderHeight =
    dimensionsWrittenToNode.height ??
    Math.round((dimensionsWrittenToNode.width * 9) / 16);

  function onMediaLoaded() {
    setIsLoading(false);
    const element = mediaRef.current;
    if (
      !element ||
      !(
        element instanceof HTMLVideoElement ||
        element instanceof HTMLImageElement
      )
    )
      return;
    writeMediaDimensionsOnLoad(
      element,
      dimensionsWrittenToNode,
      writeDimensionsToNode
    );
  }

  function getContextMenuTargetKeys() {
    return editor.getEditorState().read(() => {
      const selectedMediaKeys =
        $getSelection()
          ?.getNodes()
          .filter($isFileNode)
          .map((node) => node.getKey()) ?? [];
      return selectedMediaKeys.includes(nodeKey)
        ? selectedMediaKeys
        : [nodeKey];
    });
  }

  return (
    <>
      {!isInViewport ? (
        <FilePlaceholder
          loaderRef={loaderRef}
          nodeKey={nodeKey}
          width={dimensionsWrittenToNode.width}
          height={placeholderHeight}
        />
      ) : (
        <>
          {isLoading && (
            <FilePlaceholder
              loaderRef={loaderRef}
              nodeKey={nodeKey}
              width={dimensionsWrittenToNode.width}
              height={placeholderHeight}
            />
          )}

          <div
            ref={containerRef}
            className="inline-block relative cursor-auto mx-1 mr-2"
            onContextMenu={(e) => {
              e.preventDefault();
              const targetKeys = getContextMenuTargetKeys();
              const localFilePath = isALocalFile
                ? createFilePath(src.replace(/^\/notes\//, ''))
                : null;

              setContextMenuData({
                x: e.clientX,
                y: e.clientY,
                isShowing: true,
                targetId: null,
                items: [
                  {
                    value: 'full-width',
                    label: (
                      <MenuItemLabel
                        icon={<Maximize height="1.0625rem" width="1.0625rem" />}
                      >
                        Full width
                      </MenuItemLabel>
                    ),
                    onChange: () => {
                      const root = editor.getRootElement();
                      const container = containerRef.current;
                      if (!root || !container) return;
                      const style = getComputedStyle(container);
                      const width = Math.floor(
                        root.clientWidth -
                          parseFloat(style.marginLeft) -
                          parseFloat(style.marginRight)
                      );
                      if (width <= 0) return;

                      editor.update(
                        () => {
                          for (const key of targetKeys) {
                            const node = $getNodeByKey(key);
                            if (!$isFileNode(node)) continue;
                            const type = node.getElementType();
                            if (type !== 'image' && type !== 'video') continue;
                            const dimensions = node.getDimensions();
                            node.setDimensions(
                              {
                                width,
                                height:
                                  dimensions.height === undefined
                                    ? undefined
                                    : Math.round(
                                        (width * dimensions.height) /
                                          dimensions.width
                                      ),
                              },
                              editor
                            );
                          }
                        },
                        { tag: HISTORY_PUSH_TAG }
                      );
                    },
                  },
                  ...(localFilePath
                    ? [revealInFinder({ path: localFilePath })]
                    : []),
                  {
                    value: 'go-to-file',
                    label: (
                      <MenuItemLabel
                        icon={<Link height="1.0625rem" width="1.0625rem" />}
                      >
                        Go to file
                      </MenuItemLabel>
                    ),
                    onChange: () => {
                      if (localFilePath) {
                        navigate(localFilePath.encodedFileUrl);
                      } else {
                        void Browser.OpenURL(src);
                      }
                    },
                  },
                  {
                    value: 'delete',
                    label: (
                      <MenuItemLabel
                        icon={<Trash height="1.0625rem" width="1.0625rem" />}
                      >
                        Delete
                      </MenuItemLabel>
                    ),
                    onChange: () => {
                      editor.update(() => {
                        removeDecoratorNode(nodeKey);
                      });
                    },
                  },
                ],
              });
            }}
          >
            <AnimatePresence>
              {isSelected && !isLoading && (
                <>
                  <SelectionHighlight className="outline-4 outline-(--accent-color)" />
                  <motion.div
                    onKeyDown={moveProps.onKeyDown}
                    onMouseDown={moveProps.onMouseDown}
                    onTouchStart={moveProps.onTouchStart}
                    ref={resizeHandleRef}
                    data-drag-ghost-exclude
                    role="slider"
                    tabIndex={0}
                    aria-label={resizeAriaLabel}
                    aria-orientation="horizontal"
                    aria-valuemin={MIN_WIDTH}
                    aria-valuemax={1200}
                    aria-valuenow={Math.round(dimensionsWrittenToNode.width)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.15 } }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    className="cursor-sw-resize absolute bottom-[-8px] right-[-8px] w-5 h-5 z-20 bg-(--accent-color) rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--accent-color)"
                    // Keep Lexical from treating the handle press as a selection change.
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      moveProps.onPointerDown?.(e);
                    }}
                  />
                </>
              )}
            </AnimatePresence>
            {children({
              mediaRef,
              widthMotionValue,
              onMediaLoaded,
              onMediaError: () => setIsError(true),
              isLoading,
              src,
            })}
          </div>
        </>
      )}
    </>
  );
}
