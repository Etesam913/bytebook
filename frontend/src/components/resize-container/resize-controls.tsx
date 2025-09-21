import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { type MotionValue, motion } from 'motion/react';
import type { MouseEvent } from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { XResize } from '../../icons/arrows-expand-x';
import type { ResizeWidth } from '../../types';
import { NoteComponentControls } from '../note-component-container/component-controls';
import { useSetAtom } from 'jotai';
import { albumDataAtom } from '../editor/atoms';

export function ResizeControls({
  nodeKey,
  motionValues,
  writeWidthToNode,
  src,
  elementType,
}: {
  nodeKey: string;
  motionValues: {
    widthMotionValue: MotionValue<number | '100%'>;
    resizeHeightMotionValue: MotionValue<number | '100%'>;
    resizeWidthMotionValue: MotionValue<number | '100%'>;
  };
  writeWidthToNode: (width: ResizeWidth) => void;
  src: string;
  elementType: 'image' | 'video';
}) {
  const [editor] = useLexicalComposerContext();
  const setAlbumData = useSetAtom(albumDataAtom);
  const { widthMotionValue, resizeWidthMotionValue, resizeHeightMotionValue } =
    motionValues;

  return (
    <NoteComponentControls
      nodeKey={nodeKey}
      editor={editor}
      buttonOptions={{
        trash: {
          enabled: true,
        },
        fullscreen: {
          enabled: true,
          callback: () => {
            setAlbumData({
              isShowing: true,
              nodeKey,
              src,
              alt: '',
              elementType,
            });
          },
        },
        link: {
          enabled: true,
          src,
        },
      }}
    >
      <motion.button
        {...getDefaultButtonVariants({ disabled: false, whileHover: 1.115, whileTap: 0.95, whileFocus: 1.115 })}
        type="button"
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          widthMotionValue.set('100%');
          resizeWidthMotionValue.set('100%');
          resizeHeightMotionValue.set('100%');
          writeWidthToNode('100%');
          e.stopPropagation();
        }}
      >
        <XResize className="will-change-transform" />
      </motion.button>
    </NoteComponentControls>
  );
}
