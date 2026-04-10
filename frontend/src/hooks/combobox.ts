import { type KeyboardEvent, type RefObject, useId, useState } from 'react';

export interface ComboboxInputProps {
  role: 'combobox';
  'aria-expanded': boolean;
  'aria-controls': string;
  'aria-haspopup': 'listbox';
  'aria-activedescendant': string | undefined;
  'aria-autocomplete': 'list';
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

interface ComboboxListProps {
  id: string;
  role: 'listbox';
}

interface ComboboxItemProps {
  id: string;
  role: 'option';
  'aria-selected': boolean;
  'data-combobox-item': number;
}

export function useCombobox({
  itemCount,
  listboxId: providedListboxId,
  triggerRef,
  listRef,
  onSelectItem,
  onHighlightItem,
  onFocusTrigger,
  onBeforeHighlightItem,
}: {
  itemCount: number;
  listboxId?: string;
  triggerRef: RefObject<HTMLElement | null>;
  listRef: RefObject<HTMLElement | null>;
  onSelectItem?: (index: number) => void;
  onHighlightItem?: (index: number) => void;
  onFocusTrigger?: () => void;
  onBeforeHighlightItem?: (index: number) => void;
}) {
  const generatedId = useId();
  const listboxId = providedListboxId ?? `combobox-listbox${generatedId}`;
  const [rawFocusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Clamp focusedIndex to valid range when itemCount shrinks
  const focusedIndex =
    rawFocusedIndex === null
      ? null
      : rawFocusedIndex >= itemCount
        ? itemCount > 0
          ? itemCount - 1
          : null
        : rawFocusedIndex;

  function highlightItem(index: number) {
    if (index < 0 || index >= itemCount) return;
    onBeforeHighlightItem?.(index);
    setFocusedIndex(index);
    onHighlightItem?.(index);
  }

  function focusTrigger() {
    triggerRef.current?.focus();
    setFocusedIndex(null);
    onFocusTrigger?.();
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown': {
        if (itemCount === 0) return;
        e.preventDefault();
        const next =
          focusedIndex === null ? 0 : Math.min(focusedIndex + 1, itemCount - 1);
        highlightItem(next);
        break;
      }
      case 'ArrowUp': {
        if (itemCount === 0 || focusedIndex === null) return;
        e.preventDefault();
        if (focusedIndex === 0) {
          setFocusedIndex(null);
        } else {
          highlightItem(focusedIndex - 1);
        }
        break;
      }
      case 'Enter': {
        if (focusedIndex !== null) {
          e.preventDefault();
          onSelectItem?.(focusedIndex);
        }
        break;
      }
      case 'Escape': {
        if (focusedIndex !== null) {
          e.preventDefault();
          setFocusedIndex(null);
        }
        break;
      }
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

  function getItemByIndex(index: number) {
    return listRef.current?.querySelector<HTMLElement>(
      `[data-combobox-item="${index}"]`
    );
  }

  return {
    focusedIndex,
    setFocusedIndex,
    getInputProps,
    getListProps,
    getItemProps,
    highlightItem,
    focusTrigger,
    getItemByIndex,
  };
}
