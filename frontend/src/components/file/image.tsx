import { useAtomValue, useSetAtom } from 'jotai/react';
import { useRef, useState } from 'react';
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
import { Path } from '../../utils/string-formatting';

export function Image({
  path,
  alt,
  dimensionsWrittenToNode,
  writeDimensionsToNode,
  nodeKey,
}: {
  path: Path;
  alt: string;
  dimensionsWrittenToNode: FileDimensions;
  writeDimensionsToNode: (dimensions: FileDimensions) => void;
  nodeKey: string;
}) {
  const src = path.getFileUrl();
  const imageContainer = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const noteSeenFileNodeKeys = useAtomValue(noteSeenFileNodeKeysAtom);
  const [isSelected] = useLexicalNodeSelection(nodeKey);
  const isImageInViewport = noteSeenFileNodeKeys.has(nodeKey);
  const setDraggedGhostElement = useSetAtom(draggedGhostElementAtom);
  const noteContainerRef = useAtomValue(noteContainerRefAtom);

  useShowWhenInViewport(loaderRef);

  const imageWidthMotionValue = useMotionValue<number>(
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
      {!isImageInViewport ? (
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
            ref={imageContainer}
            className="inline-block relative cursor-auto mx-1"
          >
            {isSelected && !isLoading && (
              <>
                <div className="pointer-none outline-4 outline-(--accent-color) absolute z-10 top-0 left-0 w-full h-full bg-(--accent-color-highlight-low)" />
                <div
                  className="cursor-sw-resize absolute bottom-[-8px] right-[-8px] w-5 h-5 z-20 bg-(--accent-color) rounded-sm"
                  onMouseDown={(e) =>
                    onResize(e, {
                      elementRef: imgRef,
                      noteContainerRef,
                      widthMotionValue: imageWidthMotionValue,
                      writeDimensionsToNode,
                      setDraggedGhostElement,
                    })
                  }
                />
              </>
            )}
            <motion.img
              src={src}
              onLoad={() => {
                setIsLoading(false);
                const img = imgRef.current;
                if (!img) return;

                writeMediaDimensionsOnLoad(
                  img,
                  dimensionsWrittenToNode,
                  writeDimensionsToNode
                );
              }}
              onError={() => setIsError(true)}
              ref={imgRef}
              alt={alt}
              draggable={false}
              style={{
                width: imageWidthMotionValue,
                display: isLoading ? 'none' : 'block',
              }}
              className="my-auto scroll-m-10"
              data-node-key={nodeKey}
              data-interactable="true"
            />
          </div>
          {!isLoading && (
            <ResizeControlsPopover
              nodeKey={nodeKey}
              path={path}
              isSelected={isSelected}
              referenceElement={imageContainer}
            />
          )}
        </>
      )}
    </>
  );
}
