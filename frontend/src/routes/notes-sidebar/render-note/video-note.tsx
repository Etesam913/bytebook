import { useState } from 'react';
import { BottomBar } from '../../../components/editor/bottom-bar';
import { cn } from '../../../utils/string-formatting';
import { ErrorLoading } from './error-loading';
import { RouteFallback } from '../../../components/route-fallback';
import { LocalFilePath } from '../../../utils/path';

export function VideoNote({
  filePath,
  fileUrl,
  isNoteMaximized,
  draggedGhostElement,
}: {
  filePath: LocalFilePath;
  fileUrl: string;
  isNoteMaximized: boolean;
  draggedGhostElement: HTMLElement | null;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  return (
    <>
      {isLoading && (
        <RouteFallback height={42} width={42} className="mx-auto my-auto" />
      )}
      {isError ? (
        <ErrorLoading />
      ) : (
        <video
          controls
          title={filePath.noteWithoutExtension}
          onError={() => {
            setIsError(true);
            setIsLoading(false);
          }}
          onLoadedData={() => setIsLoading(false)}
          className={cn(
            'flex-1 overflow-auto mr-1 bg-black',
            isNoteMaximized && 'w-full mr-0',
            draggedGhostElement !== null && 'pointer-events-none'
          )}
          src={fileUrl}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      )}
      <BottomBar filePath={filePath} showTagEditor />
    </>
  );
}
