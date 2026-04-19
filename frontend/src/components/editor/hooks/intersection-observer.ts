import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import {
  noteIntersectionObserverAtom,
  noteSeenFileNodeKeysAtom,
} from '../atoms';

export function useNoteIntersectionObserver(
  folder: string,
  note: string,
  noteContainerRef: React.RefObject<HTMLDivElement | null>
) {
  const setNoteIntersectionObserver = useSetAtom(noteIntersectionObserverAtom);
  const setSeenFileNodeKeys = useSetAtom(noteSeenFileNodeKeysAtom);

  useEffect(() => {
    setSeenFileNodeKeys(new Set());
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const nodeKey = entry.target.getAttribute('data-node-key');
          if (!nodeKey) return;
          setSeenFileNodeKeys((prev) => {
            if (prev.has(nodeKey)) return prev;
            return new Set([...prev, nodeKey]);
          });
        });
      },
      {
        root: noteContainerRef.current,
        rootMargin: '0px 0px 100px 0px',
        threshold: 0.3,
      }
    );
    setNoteIntersectionObserver(observer);
    return () => {
      observer.disconnect();
      setNoteIntersectionObserver(null);
      setSeenFileNodeKeys(new Set());
    };
  }, [folder, note, noteContainerRef]);
}
