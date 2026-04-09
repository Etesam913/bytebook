import { type KeyboardEvent, type RefObject, useId, useState } from 'react';

const FOCUSABLE_SELECTOR = 'button, a, input, [tabindex]:not([tabindex="-1"])';

export interface ComboboxInputProps {
  role: 'combobox';
  'aria-expanded': boolean;
  'aria-controls': string;
  'aria-haspopup': 'listbox';
  'aria-activedescendant': string | undefined;
  'aria-autocomplete': 'list';
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}
const ITEM_SELECTOR = '[data-combobox-item]';

export interface ComboboxListProps {
  id: string;
  role: 'listbox';
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

export interface ComboboxItemProps {
  id: string;
  role: 'option';
  'aria-selected': boolean;
  'data-combobox-item': number;
}

const MAX_FOCUS_RETRY_ATTEMPTS = 6;

export function useCombobox({
  itemCount,
  listboxId: providedListboxId,
  inputRef,
  listRef,
  onFocusItem,
  onFocusInput,
  onBeforeFocusItem,
}: {
  itemCount: number;
  listboxId?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLElement | null>;
  onFocusItem?: (index: number) => void;
  onFocusInput?: () => void;
  onBeforeFocusItem?: (index: number) => void;
}) {
  const generatedId = useId();
  const listboxId = providedListboxId ?? `combobox-listbox${generatedId}`;
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  function getItemByIndex(index: number) {
    return listRef.current?.querySelector<HTMLElement>(
      `[data-combobox-item="${index}"]`
    );
  }

  function getItemIndexFromTarget(target: EventTarget | null) {
    const itemElement = (target as HTMLElement | null)?.closest<HTMLElement>(
      ITEM_SELECTOR
    );
    const rawIndex = itemElement?.dataset.comboboxItem;
    if (rawIndex === undefined) return null;

    const parsedIndex = Number(rawIndex);
    return Number.isFinite(parsedIndex) ? parsedIndex : null;
  }

  function focusElementForItem(element: HTMLElement) {
    const focusTarget =
      element.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? element;
    focusTarget.focus();
  }

  function focusItem(index: number) {
    if (index < 0 || index >= itemCount) return;

    // Callback that allows for things like scrolling to the item before trying to focus it in the case where the list is virtualized.
    onBeforeFocusItem?.(index);

    const element = getItemByIndex(index);
    if (element) {
      focusElementForItem(element);
      return;
    }

    // Add some focus retry logic as it can be finicky.
    const attemptFocus = (attempt: number) => {
      const retryElement = getItemByIndex(index);
      if (retryElement) {
        focusElementForItem(retryElement);
        return;
      }
      if (attempt < MAX_FOCUS_RETRY_ATTEMPTS) {
        requestAnimationFrame(() => attemptFocus(attempt + 1));
      }
    };

    requestAnimationFrame(() => attemptFocus(1));
  }

  function focusInput() {
    inputRef.current?.focus();
    setFocusedIndex(null);
    onFocusInput?.();
  }

  function moveFocusToItem(index: number) {
    if (index < 0 || index >= itemCount) return;
    setFocusedIndex(index);
    focusItem(index);
    onFocusItem?.(index);
  }

  // Going from input to first combobox result
  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'ArrowDown' || itemCount === 0) return;
    e.preventDefault();
    moveFocusToItem(0);
  }

  function handleListKeyDown(e: KeyboardEvent<HTMLElement>) {
    const isArrowDown = e.key === 'ArrowDown';
    const isArrowUp = e.key === 'ArrowUp';
    if (!isArrowDown && !isArrowUp) return;

    e.preventDefault();
    const currentIndex = getItemIndexFromTarget(e.target);

    if (isArrowUp && (currentIndex === null || currentIndex === 0)) {
      focusInput();
      return;
    }

    if (currentIndex === null) {
      if (isArrowDown && itemCount > 0) {
        moveFocusToItem(0);
      }
      return;
    }

    const nextIndex = isArrowDown ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < itemCount) {
      moveFocusToItem(nextIndex);
    }
  }

  function getInputProps(): ComboboxInputProps {
    return {
      role: 'combobox',
      'aria-expanded': itemCount > 0,
      'aria-controls': listboxId,
      'aria-haspopup': 'listbox',
      'aria-activedescendant':
        focusedIndex !== null
          ? `${listboxId}-option-${focusedIndex}`
          : undefined,
      'aria-autocomplete': 'list',
      onKeyDown: handleInputKeyDown,
    };
  }

  function getListProps(): ComboboxListProps {
    return {
      id: listboxId,
      role: 'listbox',
      onKeyDown: handleListKeyDown,
    };
  }

  function getItemProps(index: number): ComboboxItemProps {
    return {
      id: `${listboxId}-option-${index}`,
      role: 'option',
      'aria-selected': index === focusedIndex,
      'data-combobox-item': index,
    };
  }

  return {
    focusedIndex,
    setFocusedIndex,
    getInputProps,
    getListProps,
    getItemProps,
    focusItem,
    focusInput,
  };
}
