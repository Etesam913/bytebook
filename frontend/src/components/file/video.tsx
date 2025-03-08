import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAtomValue } from 'jotai/react';
import { useRef, useState } from 'react';
import { noteSeenFileNodeKeysAtom } from '../../atoms';
import { useShowWhenInViewport } from '../../hooks/observers';
import { useResizeCommands, useResizeState } from '../../hooks/resize';
import type { ResizeWidth } from '../../types';
import { cn } from '../../utils/string-formatting';
import { ResizeContainer } from '../resize-container';
import { FileError } from './error';

export function Video({
  src,
  widthWrittenToNode,
  writeWidthToNode,
  title,
  nodeKey,
}: {
  src: string;
  widthWrittenToNode: ResizeWidth;
  writeWidthToNode: (width: ResizeWidth) => void;
  title: string;
  nodeKey: string;
}) {
  const [editor] = useLexicalComposerContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null); // Reference for loader
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const noteSeenFileNodeKeys = useAtomValue(noteSeenFileNodeKeysAtom);

  const {
    isResizing,
    setIsResizing,
    isSelected,
    setSelected,
    clearSelection,
    isExpanded,
    setIsExpanded,
  } = useResizeState(nodeKey);

  useResizeCommands(
    editor,
    isExpanded,
    setIsExpanded,
    isSelected,
    nodeKey,
    clearSelection,
    videoRef
  );

  const isVideoInViewport = noteSeenFileNodeKeys.has(nodeKey);

  useShowWhenInViewport(loaderRef, isExpanded, isVideoInViewport);

  if (isError) {
    return <FileError src={src} nodeKey={nodeKey} type="loading-fail" />;
  }

  return (
    <>
      {!isVideoInViewport ? (
        <div
          ref={loaderRef}
          data-node-key={nodeKey}
          className="my-3 w-full h-[36rem] bg-gray-200 dark:bg-zinc-600 animate-pulse pointer-events-none"
        />
      ) : (
        <>
          {isLoading && (
            <div className="my-3 w-full h-[36rem] bg-gray-200 dark:bg-zinc-600 animate-pulse pointer-events-none" />
          )}
          <ResizeContainer
            resizeState={{
              isResizing,
              setIsResizing,
              isSelected,
              setSelected,
              isExpanded,
              setIsExpanded,
            }}
            ref={videoRef}
            nodeKey={nodeKey}
            defaultWidth={widthWrittenToNode}
            writeWidthToNode={writeWidthToNode}
            elementType="default"
            src={src}
          >
            {(isExpanded || !isExpanded) && (
              <video
                ref={videoRef}
                style={{ display: isLoading ? 'none' : 'inline' }}
                className={cn(
                  'w-full h-auto bg-black my-auto scroll-m-10',
                  isExpanded && 'h-full'
                )}
                title={title}
                src={src}
                controls
                onLoadedData={() => setIsLoading(false)}
                onError={() => setIsError(true)}
                preload="auto"
                crossOrigin="anonymous"
                data-node-key={nodeKey}
                data-interactable="true"
              />
            )}
          </ResizeContainer>
        </>
      )}
    </>
  );
}
