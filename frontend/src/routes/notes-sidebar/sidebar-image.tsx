import { useState } from 'react';
import { BottomBar } from '../../components/editor/bottom-bar';
import { Loader } from '../../icons/loader';
import { cn } from '../../utils/string-formatting';
import { ErrorLoading } from './error-loading';

export function SidebarImage({
  folder,
  note,
  fileUrl,
  fileExtension,
  isNoteMaximized,
}: {
  folder: string;
  note: string;
  fileUrl: string;
  fileExtension: string;
  isNoteMaximized: boolean;
}) {
  const [isLoading, setIsLoading] = useState(true);

  const [isError, setIsError] = useState(false);
  return (
    <>
      {isLoading && (
        <Loader width={42} height={42} className="mx-auto my-auto" />
      )}
      {isError ? (
        <ErrorLoading />
      ) : (
        <img
          className={cn(
            'flex-1 overflow-auto object-contain my-auto mr-1',
            isNoteMaximized && 'w-full'
          )}
          alt={note}
          title={note}
          src={fileUrl}
          onError={() => {
            setIsError(true);
            setIsLoading(false);
          }}
          onLoad={() => setIsLoading(false)}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      )}
      <BottomBar folder={folder} note={note} ext={fileExtension} />
    </>
  );
}
