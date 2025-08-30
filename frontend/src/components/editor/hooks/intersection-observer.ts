import { useEffect } from 'react';
import { useAtom } from 'jotai';
import {
  noteIntersectionObserverAtom,
  noteSeenFileNodeKeysAtom,
} from '../atoms';

export function useNoteIntersectionObserver(
  folder: string,
  note: string,
  noteContainerRef: React.RefObject<HTMLDivElement | null>
) {
  const [noteIntersectionObserver, setNoteIntersectionObserver] = useAtom(
    noteIntersectionObserverAtom
  );
  const [seenFileNodeKeys, setSeenFileNodeKeys] = useAtom(
    noteSeenFileNodeKeysAtom
  );

  useEffect(() => {
    setSeenFileNodeKeys(new Set([]));
    setNoteIntersectionObserver(() => {
      return new IntersectionObserver((entries) => {
        entries.forEach(
          (entry) => {
            if (entry.isIntersecting) {
              const nodeKey = entry.target.getAttribute('data-node-key');
              if (nodeKey && !seenFileNodeKeys.has(nodeKey)) {
                setSeenFileNodeKeys(
                  (prevFileNodeKeys) => new Set([...prevFileNodeKeys, nodeKey])
                );
              }
            }
          },
          {
            root: noteContainerRef.current,
            rootMargin: '0px 0px 100px 0px',
            threshold: 0.3,
          }
        );
      });
    });
    return () => {
      noteIntersectionObserver?.disconnect();
      setNoteIntersectionObserver(null);
      setSeenFileNodeKeys(new Set([]));
    };
  }, [folder, note, noteContainerRef]);
}
