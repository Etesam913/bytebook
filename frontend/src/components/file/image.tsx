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

export function Image({
  src,
  alt,
  widthWrittenToNode,
  writeWidthToNode,
  nodeKey,
}: {
  src: string;
  alt: string;
  widthWrittenToNode: ResizeWidth;
  writeWidthToNode: (width: ResizeWidth) => void;
  nodeKey: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [editor] = useLexicalComposerContext();
  const loaderRef = useRef<HTMLDivElement>(null); // Reference for loader
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const noteSeenFileNodeKeys = useAtomValue(noteSeenFileNodeKeysAtom);

  const isImageInViewport = noteSeenFileNodeKeys.has(nodeKey);

  const { isResizing, setIsResizing, isExpanded, setIsExpanded } =
    useResizeState();

  useResizeCommands(editor, isExpanded, setIsExpanded, nodeKey, imgRef);

  useShowWhenInViewport(loaderRef);

  if (isError) {
    return <FileError src={src} nodeKey={nodeKey} type="loading-fail" />;
  }

  return (
    <>
      {!isImageInViewport ? (
        <div
          ref={loaderRef}
          data-node-key={nodeKey}
          className={cn(
            'my-3 w-full h-[36rem] bg-gray-200 dark:bg-zinc-600 animate-pulse pointer-events-none'
          )}
        />
      ) : (
        <>
          {isLoading && (
            <div
              className={cn(
                'my-3 w-full h-[36rem] bg-gray-200 dark:bg-zinc-600 animate-pulse pointer-events-none'
              )}
            />
          )}

          <ResizeContainer
            resizeState={{
              isResizing,
              setIsResizing,
              isExpanded,
              setIsExpanded,
            }}
            ref={imgRef}
            nodeKey={nodeKey}
            defaultWidth={widthWrittenToNode}
            writeWidthToNode={writeWidthToNode}
            src={src}
            elementType="image"
          >
            <img
              style={{
                display: isLoading ? 'none' : 'block',
              }}
              src={src}
              onLoad={() => setIsLoading(false)}
              onError={() => setIsError(true)}
              ref={imgRef}
              alt={alt}
              draggable={false}
              className="h-auto my-auto w-full scroll-m-10"
              data-node-key={nodeKey}
              data-interactable="true"
            />
          </ResizeContainer>
        </>
      )}
    </>
  );
}
