import { type RefObject, useEffect, useRef, useState } from 'react';

/**
 * Syncs a ref's current value to state, avoiding ref access during render.
 * Useful when you need the ref value in render (e.g., for portals).
 */
export function useRefState<T>(ref: RefObject<T | null> | null): T | null {
  const [state, setState] = useState<T | null>(null);
  const prevElementRef = useRef<T | null>(null);

  useEffect(() => {
    // Use queueMicrotask to ensure this runs after React has finished rendering
    // and the ref has been attached to the DOM
    queueMicrotask(() => {
      const element = ref?.current ?? null;
      if (element !== prevElementRef.current) {
        prevElementRef.current = element;
        setState(element);
      }
    });
  });

  return state;
}
