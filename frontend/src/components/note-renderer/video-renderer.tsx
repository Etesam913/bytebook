import { useState } from 'react';
import { FilePath } from '../../utils/path';
import { RouteFallback } from '../route-fallback';
import { ErrorLoading } from '../../routes/notes-sidebar/render-note/error-loading';

export function VideoRenderer({ filePath }: { filePath: FilePath }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  return (
    <>
      {isLoading && (
        <RouteFallback
          height="2.625rem"
          width="2.625rem"
          className="mx-auto my-auto"
        />
      )}
      {isError ? (
        <span className="w-full text-center my-auto">
          <ErrorLoading />
        </span>
      ) : (
        <video
          controls={true}
          title={filePath.noteWithoutExtension}
          onError={() => {
            setIsError(true);
            setIsLoading(false);
          }}
          onLoadedData={() => setIsLoading(false)}
          preload="auto"
          className="w-full h-full object-contain"
          src={filePath.fileUrl}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      )}
    </>
  );
}
