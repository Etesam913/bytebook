import { useState } from 'react';
import { BottomBar } from '../../components/editor/bottom-bar';
import { cn } from '../../utils/string-formatting';
import { ErrorLoading } from './error-loading';
import { RouteFallback } from '../../components/route-fallback';

export function SidebarVideo({
  folder,
  note,
  fileUrl,
  fileExtension,
  isNoteMaximized,
  draggedElement,
}: {
  folder: string;
  note: string;
  fileUrl: string;
  fileExtension: string;
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
          title={note}
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
      <BottomBar folder={folder} note={note} ext={fileExtension} />
    </>
  );
}
