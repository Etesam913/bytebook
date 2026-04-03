import { motion } from 'motion/react';
import type { FileDimensions } from '../../editor/nodes/types';
import { MediaContainer } from './index';

export function Image({
  src,
  alt,
  dimensionsWrittenToNode,
  writeDimensionsToNode,
  nodeKey,
}: {
  src: string;
  alt: string;
  dimensionsWrittenToNode: FileDimensions;
  writeDimensionsToNode: (dimensions: FileDimensions) => void;
  nodeKey: string;
}) {
  return (
    <MediaContainer
      src={src}
      dimensionsWrittenToNode={dimensionsWrittenToNode}
      writeDimensionsToNode={writeDimensionsToNode}
      nodeKey={nodeKey}
      resizeAriaLabel="Resize image"
    >
      {({
        mediaRef,
        widthMotionValue,
        onMediaLoaded,
        onMediaError,
        isLoading,
        src,
      }) => (
        <motion.img
          src={src}
          onLoad={onMediaLoaded}
          onError={onMediaError}
          ref={mediaRef as React.RefObject<HTMLImageElement | null>}
          alt={alt}
          draggable={false}
          style={{
            width: widthMotionValue,
            display: isLoading ? 'none' : 'block',
          }}
          className="my-auto scroll-m-10"
          data-node-key={nodeKey}
          data-interactable="true"
        />
      )}
    </MediaContainer>
  );
}
