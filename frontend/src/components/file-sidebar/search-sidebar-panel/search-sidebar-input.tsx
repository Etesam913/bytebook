import {
  Dispatch,
  type KeyboardEvent,
  type RefObject,
  SetStateAction,
  useId,
  useRef,
  useState,
} from 'react';
import { useOnClickOutside } from '../../../hooks/general';
import { DropdownItems } from '../../dropdown/dropdown-items';
import { Input } from '../../input';
import type { ComboboxInputProps } from '../../../hooks/combobox';
import type { DropdownItem } from '../../../types';

const SEARCH_PREFIX_ITEMS: DropdownItem[] = [
  { value: 'f:', label: 'f: \u2014 Search file or folder names' },
  { value: 'tag:', label: 'tag: \u2014 Search tag names' },
  { value: 'type:', label: 'type: \u2014 Filter by type' },
  // { value: 'lang:', label: 'lang: \u2014 Language' },
  { value: '@:', label: 'link: \u2014 Search notes with the link' },
  { value: 'sort:', label: 'sort: \u2014 Sort results' },
];

function shouldShowPrefixDropdown(value: string): boolean {
  if (value.length === 0) return true;

  let inQuotes = false;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '"') {
      inQuotes = !inQuotes;
    } else if (value[i] === ' ' && !inQuotes) {
      return true;
    }
  }
  return false;
}

export function SearchSidebarInput({
  inputRef,
  value,
  setInternalSearchQuery,
  onKeyDown,
  comboboxInputProps,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  setInternalSearchQuery: Dispatch<SetStateAction<string>>;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  comboboxInputProps: Omit<ComboboxInputProps, 'onKeyDown'>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const menuId = `prefix-menu-${useId()}`;
  const inputId = `search-input-${useId()}`;

  useOnClickOutside(containerRef, () => setIsOpen(false));

  function handlePrefixSelect(item: DropdownItem) {
    const input = inputRef.current;
    const cursorPos = input?.selectionStart ?? value.length;
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);
    const newValue = before + item.value + after;
    setInternalSearchQuery(newValue);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="px-2 pb-2 relative">
      <Input
        ref={inputRef}
        labelProps={{}}
        inputProps={{
          ...comboboxInputProps,
          id: inputId,
          type: 'text',
          placeholder: 'Search...',
          value,
          onChange: (e) => {
            const newValue = e.target.value;
            setInternalSearchQuery(newValue);
            setIsOpen(shouldShowPrefixDropdown(newValue));
          },
          onKeyDown: (e) => {
            if (isOpen) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusIndex(0);
                document.getElementById(`${menuId}-option-0`)?.focus();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
              }
            }
            onKeyDown(e);
          },
          className: 'w-full text-sm py-1.5 px-2 rounded-md font-code',
          autoFocus: true,
          autoCapitalize: 'off',
          autoComplete: 'off',
          autoCorrect: 'off',
          spellCheck: false,
        }}
        clearable={true}
      />
      <DropdownItems
        items={SEARCH_PREFIX_ITEMS}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        setFocusIndex={setFocusIndex}
        focusIndex={focusIndex}
        onChange={handlePrefixSelect}
        menuId={menuId}
        buttonId={inputId}
        skipAnimation
        className="text-xs font-code w-72"
      />
    </div>
  );
}
