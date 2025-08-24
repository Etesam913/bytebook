import { useState } from 'react';
import { BottomBar } from '../../components/editor/bottom-bar';
import { cn } from '../../utils/string-formatting';
import { ErrorLoading } from './error-loading';
import { RouteFallback } from '../../components/route-fallback';
import { FilePath } from '../../utils/string-formatting';

export function SidebarVideo({
  filePath,
  fileUrl,
  isNoteMaximized,
  draggedElement,
}: {
  filePath: FilePath;
  fileUrl: string;
  isNoteMaximized: boolean;
  draggedElement: HTMLElement | null;
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
            draggedElement !== null && 'pointer-events-none'
          )}
          src={fileUrl}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      )}
      <BottomBar filePath={filePath} />
    </>
  );
}
