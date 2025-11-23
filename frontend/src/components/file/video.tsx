import { useAtomValue, useSetAtom } from 'jotai/react';
import { useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  noteContainerRefAtom,
  noteSeenFileNodeKeysAtom,
} from '../editor/atoms';
import { useShowWhenInViewport } from '../../hooks/observers';
import { motion, useMotionValue } from 'motion/react';
import { draggedGhostElementAtom } from '../editor/atoms';
import { FileError } from './error';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { ResizeControlsPopover } from '../resize-container/resize-controls-popover';
import { FileDimensions } from '../editor/nodes/types';
import { onResize, writeMediaDimensionsOnLoad } from './utils/resize';
import { FilePlaceholder } from './placeholder';
import { Path } from '../../utils/path';
import { SelectionHighlight } from '../selection-highlight';

export function Video({
  path,
  dimensionsWrittenToNode,
  writeDimensionsToNode,
  title,
  nodeKey,
}: {
  path: Path;
  dimensionsWrittenToNode: FileDimensions;
  writeDimensionsToNode: (dimensions: FileDimensions) => void;
  title: string;
  nodeKey: string;
}) {
  const src = path.getFileUrl();
  const videoContainer = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null); // Reference for loader
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const noteSeenFileNodeKeys = useAtomValue(noteSeenFileNodeKeysAtom);
  const [isSelected] = useLexicalNodeSelection(nodeKey);
  const isVideoInViewport = noteSeenFileNodeKeys.has(nodeKey);
  const setDraggedGhostElement = useSetAtom(draggedGhostElementAtom);
  const noteContainerRef = useAtomValue(noteContainerRefAtom);

  useShowWhenInViewport(loaderRef);

  const videoWidthMotionValue = useMotionValue<number>(
    dimensionsWrittenToNode.width
  );

  if (isError) {
    return <FileError path={path} nodeKey={nodeKey} type="loading-fail" />;
  }

  const placeholderHeight =
    dimensionsWrittenToNode.height ??
    Math.round((dimensionsWrittenToNode.width * 9) / 16);

  return (
    <>
      {!isVideoInViewport ? (
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
            ref={videoContainer}
            className="inline-block relative cursor-auto mx-1"
          >
            <AnimatePresence>
              {isSelected && !isLoading && (
                <>
                  <SelectionHighlight className="outline-4 outline-(--accent-color)" />
                  <div
                    className="cursor-sw-resize absolute bottom-[-8px] right-[-8px] w-5 h-5 z-20 bg-(--accent-color) rounded-sm"
                    onMouseDown={(e) =>
                      onResize(e, {
                        elementRef: videoRef,
                        noteContainerRef,
                        widthMotionValue: videoWidthMotionValue,
                        writeDimensionsToNode,
                        setDraggedGhostElement,
                      })
                    }
                  />
                </>
              )}
            </AnimatePresence>
            <motion.video
              ref={videoRef}
              src={src}
              onLoadedData={() => {
                setIsLoading(false);
                const video = videoRef.current;
                if (!video) return;

                writeMediaDimensionsOnLoad(
                  video,
                  dimensionsWrittenToNode,
                  writeDimensionsToNode
                );
              }}
              onError={() => setIsError(true)}
              title={title}
              controls
              preload="auto"
              draggable={false}
              style={{
                width: videoWidthMotionValue,
                display: isLoading ? 'none' : 'block',
              }}
              className="bg-black my-auto scroll-m-10"
              data-node-key={nodeKey}
              data-interactable="true"
            />
          </div>
          {!isLoading && (
            <ResizeControlsPopover
              nodeKey={nodeKey}
              path={path}
              isSelected={isSelected}
              referenceElement={videoContainer}
            />
          )}
        </>
      )}
    </>
  );
}
