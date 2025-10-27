import { type MotionValue } from 'motion/react';
import type { RefObject } from 'react';
import type { ResizeWidth } from '../../types';
import { ResizeControlsPopover } from './resize-controls-popover';

export function ResizeControls({
  nodeKey,
  motionValues,
  writeWidthToNode,
  src,
  isSelected,
  referenceElement,
}: {
  nodeKey: string;
  motionValues: {
    widthMotionValue: MotionValue<number | '100%'>;
    resizeHeightMotionValue: MotionValue<number | '100%'>;
    resizeWidthMotionValue: MotionValue<number | '100%'>;
  };
  writeWidthToNode: (width: ResizeWidth) => void;
  src: string;
  isSelected: boolean;
  referenceElement: RefObject<HTMLElement | null>;
}) {
  return (
    <ResizeControlsPopover
      nodeKey={nodeKey}
      motionValues={motionValues}
      writeWidthToNode={writeWidthToNode}
      src={src}
      isSelected={isSelected}
      referenceElement={referenceElement}
    />
  );
}
