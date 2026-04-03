import { motion } from 'motion/react';
import type { FileDimensions } from '../../editor/nodes/types';
import { MediaContainer } from './index';

export function Video({
  src,
  dimensionsWrittenToNode,
  writeDimensionsToNode,
  title,
  nodeKey,
}: {
  src: string;
  dimensionsWrittenToNode: FileDimensions;
  writeDimensionsToNode: (dimensions: FileDimensions) => void;
  title: string;
  nodeKey: string;
}) {
  return (
    <MediaContainer
      src={src}
      dimensionsWrittenToNode={dimensionsWrittenToNode}
      writeDimensionsToNode={writeDimensionsToNode}
      nodeKey={nodeKey}
      resizeAriaLabel="Resize video"
    >
      {({
        mediaRef,
        widthMotionValue,
        onMediaLoaded,
        onMediaError,
        isLoading,
        src,
      }) => (
        <motion.video
          ref={mediaRef as React.RefObject<HTMLVideoElement | null>}
          src={src}
          onLoadedData={onMediaLoaded}
          onError={onMediaError}
          title={title}
          controls
          preload="auto"
          draggable={false}
          style={{
            width: widthMotionValue,
            display: isLoading ? 'none' : 'block',
          }}
          className="bg-black my-auto scroll-m-10"
          data-node-key={nodeKey}
          data-interactable="true"
        />
      )}
    </MediaContainer>
  );
}
