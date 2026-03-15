import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { isNoteMaximizedAtom } from '../../atoms';
import { Ufo } from '../../icons/ufo';

export function NotFound() {
  const setIsNoteMaximized = useSetAtom(isNoteMaximizedAtom);

  useEffect(() => {
    setIsNoteMaximized(false);
  }, [setIsNoteMaximized]);

  return (
    <section className="flex flex-col items-center justify-center h-full flex-1 gap-3 pb-16 px-3 text-center">
      <Ufo width={48} height={48} />
      <h1 className="text-2xl font-bold">
        Sorry, but this note does not exist.
      </h1>
    </section>
  );
}
