import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ArrowButton } from './arrow-button';
import { motion } from 'motion/react';
import { getDefaultButtonVariants } from '../../../animations';
import { XMark } from '../../../icons/circle-xmark';
import { useAtom, useSetAtom } from 'jotai/react';
import { albumDataAtom, trapFocusContainerAtom } from '../../../atoms';
import { useEffect, useRef } from 'react';
import { useMouseActivity } from '../../resize-container/utils';
import { FileNode } from '../nodes/file';
import { $nodesOfType } from 'lexical';

export function Album() {
  const [{ elementType, src, nodeKey }, setAlbumData] = useAtom(albumDataAtom);

  const [editor] = useLexicalComposerContext();

  const [shouldUseMouseActivity, setShouldUseMouseActivity] = useMouseActivity(
    10000,
    true
  );
  const albumRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  function moveToNextOrPrevFile(direction: 'left' | 'right') {
    setShouldUseMouseActivity(true);
    let fileNodeToLeft: null | FileNode = null;
    let fileNodeToRight: null | FileNode = null;
    editor.read(() => {
      const fileNodes = $nodesOfType(FileNode);
      let hasSeenNodeKey = false;
      for (let i = 0; i < fileNodes.length; i++) {
        const node = fileNodes[i];
        if (
          node.getElementType() !== 'image' &&
          node.getElementType() !== 'video'
        ) {
          continue;
        }
        if (node.getKey() === nodeKey) {
          hasSeenNodeKey = true;
        } else {
          if (!hasSeenNodeKey) {
            fileNodeToLeft = node;
          } else if (hasSeenNodeKey && !fileNodeToRight) {
            fileNodeToRight = node;
            break;
          }
        }
      }

      if (direction === 'left' && fileNodeToLeft) {
        setAlbumData({
          isShowing: true,
          nodeKey: fileNodeToLeft.getKey(),
          src: fileNodeToLeft.getSrc(),
          alt: '',
          elementType: fileNodeToLeft.getElementType(),
        });
      }
      if (direction === 'right' && fileNodeToRight) {
        setAlbumData({
          isShowing: true,
          nodeKey: fileNodeToRight.getKey(),
          src: fileNodeToRight.getSrc(),
          alt: '',
          elementType: fileNodeToRight.getElementType(),
        });
      }

      if (albumRef.current) {
        albumRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    });
  }

  const setTrapFocusContainer = useSetAtom(trapFocusContainerAtom);

  useEffect(() => {
    if (albumRef.current) {
      setTrapFocusContainer(albumRef.current);
    }
    return () => {
      setTrapFocusContainer(null);
    };
  }, [albumRef]);

  return (
    <div
      ref={albumRef}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          moveToNextOrPrevFile('left');
        }
        if (e.key === 'ArrowRight') {
          moveToNextOrPrevFile('right');
        }
        if (e.key === 'Escape') {
          setAlbumData({
            isShowing: false,
            nodeKey: null,
            src: null,
            alt: null,
            elementType: null,
          });
        }
      }}
      className="overflow-auto flex flex-col items-center absolute bg-black w-screen h-screen top-0 left-0 z-60"
    >
      {nodeKey && (
        <>
          <ArrowButton
            nodeKey={nodeKey}
            direction="left"
            shouldUseMouseActivity={shouldUseMouseActivity}
            setShouldUseMouseActivity={setShouldUseMouseActivity}
            onClick={() => moveToNextOrPrevFile('left')}
          />
          <ArrowButton
            nodeKey={nodeKey}
            direction="right"
            shouldUseMouseActivity={shouldUseMouseActivity}
            setShouldUseMouseActivity={setShouldUseMouseActivity}
            onClick={() => moveToNextOrPrevFile('right')}
          />
        </>
      )}
      <motion.button
        {...getDefaultButtonVariants()}
        onClick={() => {
          setAlbumData({
            isShowing: false,
            nodeKey: null,
            src: null,
            alt: null,
            elementType: null,
          });
        }}
        className="fixed z-50 right-5 top-4 bg-[rgba(0,0,0,0.55)] text-white p-1 rounded-full"
        type="submit"
      >
        <XMark width={24} height={24} />
      </motion.button>
      {elementType === 'image' && src && (
        <img className="my-auto mx-0" draggable={false} src={src} />
      )}
      {elementType === 'video' && src && (
        <video ref={videoRef} className="h-full" controls src={src} />
      )}
    </div>
  );
}
