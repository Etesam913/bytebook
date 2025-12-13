import { useAtomValue } from 'jotai/react';
import { type RefObject, useEffect } from 'react';
import { noteIntersectionObserverAtom } from '../components/editor/atoms';

/**
 * Custom hook for showing an element when it enters the viewport.
 *
 * @param loaderRef - React ref object for the loader element
 */
export function useShowWhenInViewport(
  loaderRef: RefObject<HTMLDivElement | null>
) {
  const noteIntersectionObserver = useAtomValue(noteIntersectionObserverAtom);

  useEffect(() => {
    if (!loaderRef.current || !noteIntersectionObserver) return;
    noteIntersectionObserver.observe(loaderRef.current);
    return () => {
      if (!loaderRef.current || !noteIntersectionObserver) return;
      noteIntersectionObserver.unobserve(loaderRef.current);
    };
  }, [loaderRef, noteIntersectionObserver]);
}
