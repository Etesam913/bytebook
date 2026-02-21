import { type RefObject, useEffect } from 'react';

/**
 * Hook that triggers a handler function when a click is detected outside of the specified element or when tab is pressed.
 *
 * @param ref - A React ref object pointing to the element to detect outside clicks for.
 * @param handler - A function to be called when a click outside the referenced element is detected or tab is pressed.
 * @param excludedElements - A list of html elememnts that ignore the onClickOutside if the click is in the excluded element
 */
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | KeyboardEvent) => void,
  excludedElements?: (HTMLElement | null)[]
): void {
  useEffect(
    () => {
      const listener = (event: MouseEvent): void => {
        // Do nothing if clicking ref's element or descendent elements
        if (
          !ref.current ||
          ref.current.contains(event.target as Node) ||
          (excludedElements ?? []).some((element) =>
            element?.contains?.(event.target as Node)
          ) ||
          (event.target as HTMLElement).getAttribute(
            'data-exclude-from-on-click-outside'
          ) === 'true'
        ) {
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
      document.addEventListener('keydown', keyListener);

      // Remove event listeners on cleanup
      return () => {
        document.removeEventListener('mousedown', listener);
        document.removeEventListener('keydown', keyListener);
      };
    },
    // Re-run if ref or handler changes
    [ref, handler, excludedElements]
  );
}
