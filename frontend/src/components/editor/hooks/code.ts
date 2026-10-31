import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { editorAtom, noteContainerRefAtom } from '../atoms';

export function useCodeCleanup(
  noteContainerRef: React.RefObject<HTMLDivElement | null>
) {
  const setEditor = useSetAtom(editorAtom);
  const setNoteContainerRef = useSetAtom(noteContainerRefAtom);

  useEffect(() => {
    setNoteContainerRef(noteContainerRef);

    return () => {
      // Resets some state
      setNoteContainerRef(null);
      setEditor(null);
    };
  }, [noteContainerRef]);
}
