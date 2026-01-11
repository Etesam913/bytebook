import { useState } from 'react';
import { FilePath } from '../../utils/path';
import { RouteFallback } from '../route-fallback';
import { ErrorLoading } from '../../routes/notes-sidebar/render-note/error-loading';

export function ImageRenderer({ filePath }: { filePath: FilePath }) {
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
          className="w-full h-full object-contain"
          alt={filePath.noteWithoutExtension}
          title={filePath.noteWithoutExtension}
          src={filePath.fileUrl}
          onError={() => {
            setIsError(true);
            setIsLoading(false);
          }}
          onLoad={() => setIsLoading(false)}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      )}
    </>
  );
}
