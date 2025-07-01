import { type RefObject, useEffect, useRef } from 'react';
import { trapFocusContainerAtom } from '../atoms';
import { useAtomValue } from 'jotai';

/**
 * Hook that triggers a handler function when a click is detected outside of the specified element or when tab is pressed.
 *
 * @param ref - A React ref object pointing to the element to detect outside clicks for.
 * @param handler - A function to be called when a click outside the referenced element is detected or tab is pressed.
 * @param excludedElements - A list of html elememnts that ignore the onClickOutside if the click is in the excluded element
 */
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent | KeyboardEvent) => void,
  excludedElements?: (HTMLElement | null)[]
): void {
  useEffect(
    () => {
      const listener = (event: MouseEvent | TouchEvent): void => {
        // Do nothing if clicking ref's element or descendent elements
        if (
          !ref.current ||
          ref.current.contains(event.target as Node) ||
          (excludedElements ?? []).some((element) =>
            element?.contains(event.target as Node)
          ) ||
          (event.target as HTMLElement).getAttribute(
            'data-exclude-from-on-click-outside'
          ) === 'true'
        ) {
          return;
        }
        console.count('handler ran');
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
    [ref, handler, excludedElements]
  );
}

/**
 * Hook to trap focus within a given container element.
 * Attach this in App.tsx by passing the container node (e.g., modal root).
 * Listens on document for Tab presses and cycles focus inside the container.
 */
export function useTrapFocus() {
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const trapFocusContainer = useAtomValue(trapFocusContainerAtom);

  useEffect(() => {
    if (!trapFocusContainer) return;

    // Save focus before trap
    previouslyFocused.current = document.activeElement as HTMLElement;

    // Utility: get visible, focusable elements
    const getFocusable = (): HTMLElement[] => {
      const selectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([type="hidden"]):not([disabled])',
        'select:not([disabled])',
        '[tabindex]',
      ];
      return Array.from(
        trapFocusContainer.querySelectorAll<HTMLElement>(selectors.join(','))
      ).filter((el) => {
        // Must be focusable by tabindex and actually visible (including fixed elements)
        const hasValidTabIndex = el.tabIndex >= 0;
        const isVisible =
          el.offsetParent !== null || el.getClientRects().length > 0;
        const notHiddenInput = !(
          el instanceof HTMLInputElement && el.type === 'hidden'
        );
        return hasValidTabIndex && isVisible && notHiddenInput;
      });
    };

    // Initial focus into container
    const items = getFocusable();
    if (items.length) {
      // Check for element with autofocus first
      const autofocusElement = items.find((el) => el.hasAttribute('autofocus'));
      if (autofocusElement) {
        autofocusElement.focus();
      } else {
        items[0].focus();
      }
    } else {
      // trapFocusContainer.setAttribute('tabindex', '-1');
      trapFocusContainer.focus();
    }

    // Key handler
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) {
        e.preventDefault();
        return;
      }
      const active = document.activeElement as HTMLElement;
      active.classList.remove('focus-visible');
      if (e.shiftKey) {
        const currentIndex = focusable.indexOf(active);
        const nextIndex = currentIndex - 1;
        const nextElement =
          nextIndex < 0
            ? focusable[focusable.length - 1]
            : focusable[nextIndex];
        nextElement.focus();
        nextElement.classList.add('focus-visible');
        e.preventDefault();
      } else {
        e.preventDefault();
        const currentIndex = focusable.indexOf(active);
        const nextIndex = currentIndex + 1;
        const nextElement =
          nextIndex >= focusable.length ? focusable[0] : focusable[nextIndex];
        nextElement.focus();
        nextElement.classList.add('focus-visible');
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
      previouslyFocused.current?.focus();
    };
  }, [trapFocusContainer]);
}
