import { useState } from 'react';
import { BottomBar } from '../../../components/editor/bottom-bar';
import { cn } from '../../../utils/string-formatting';
import { ErrorLoading } from './error-loading';
import { RouteFallback } from '../../../components/route-fallback';
import { LocalFilePath } from '../../../utils/string-formatting';

export function ImageNote({
  filePath,
  fileUrl,
  isNoteMaximized,
}: {
  filePath: LocalFilePath;
  fileUrl: string;
  isNoteMaximized: boolean;
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
        <img
          className={cn(
            'flex-1 overflow-auto object-contain my-auto mr-1',
            isNoteMaximized && 'w-full'
          )}
          alt={filePath.noteWithoutExtension}
          title={filePath.noteWithoutExtension}
          src={fileUrl}
          onError={() => {
            setIsError(true);
            setIsLoading(false);
          }}
          onLoad={() => setIsLoading(false)}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      )}
      <BottomBar filePath={filePath} />
    </>
  );
}
