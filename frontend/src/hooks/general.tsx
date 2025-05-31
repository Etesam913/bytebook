import { type RefObject, useEffect } from 'react';

/**
 * Hook that triggers a handler function when a click is detected outside of the specified element or when tab is pressed.
 *
 * @param ref - A React ref object pointing to the element to detect outside clicks for.
 * @param handler - A function to be called when a click outside the referenced element is detected or tab is pressed.
 */
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent | KeyboardEvent) => void
): void {
  useEffect(
    () => {
      const listener = (event: MouseEvent | TouchEvent): void => {
        // Do nothing if clicking ref's element or descendent elements
        if (!ref.current || ref.current.contains(event.target as Node)) {
          return;
        }

        handler(event);
      };

      const keyListener = (event: KeyboardEvent): void => {
        if (event.key === 'Tab') {
          handler(event);
        }
      };

      // Add event listeners
      document.addEventListener('mousedown', listener);
      document.addEventListener('touchstart', listener);
      document.addEventListener('keydown', keyListener);

      // Remove event listeners on cleanup
      return () => {
        document.removeEventListener('mousedown', listener);
        document.removeEventListener('touchstart', listener);
        document.removeEventListener('keydown', keyListener);
      };
    },
    // Re-run if ref or handler changes
    [ref, handler]
  );
}
