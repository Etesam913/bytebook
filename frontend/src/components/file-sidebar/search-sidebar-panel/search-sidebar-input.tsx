import { type KeyboardEvent, type RefObject, useId, useState } from 'react';
// import type { Key } from 'react-aria-components';
import { Input } from '../../input';
import type { ComboboxInputProps } from '../../../hooks/combobox';
// import { AppMenu, AppMenuItem } from '../../menu';

// const SEARCH_PREFIX_ITEMS = [
//   { id: 'f:', label: 'f: \u2014 Search file or folder names' },
//   { id: '#', label: '# \u2014 Search files that have a tag' },
//   { id: '@', label: '@ \u2014 Search notes that contain a link' },
//   { id: 'type:', label: 'type: \u2014 Filter files by type' },
//   { id: 'sort:', label: 'sort: \u2014 Sort results' },
// ];

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
  setInternalSearchQuery: (query: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  comboboxInputProps: Omit<ComboboxInputProps, 'onKeyDown'>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const inputId = `search-input-${useId()}`;

  // function handlePrefixSelect(key: Key) {
  //   const input = inputRef.current;
  //   const cursorPos = input?.selectionStart ?? value.length;
  //   const before = value.slice(0, cursorPos);
  //   const after = value.slice(cursorPos);
  //   const newValue = before + String(key) + after;
  //   setInternalSearchQuery(newValue);
  //   setIsOpen(false);
  //   // Return focus to the input after selecting a prefix
  //   setTimeout(() => inputRef.current?.focus(), 0);
  // }

  return (
    <div className="p-2 relative">
      <Input
        ref={inputRef}
        labelProps={{}}
        inputProps={{
          ...comboboxInputProps,
          id: inputId,
          type: 'text',
          placeholder: 'Search...',
          value,
          onFocus: () => setIsOpen(shouldShowPrefixDropdown(value)),
          onChange: (e) => {
            const newValue = e.target.value;
            setInternalSearchQuery(newValue);
            setIsOpen(shouldShowPrefixDropdown(newValue));
          },
          onKeyDown: (e) => {
            if (isOpen) {
              if (e.key === 'Escape') {
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
      {/*{isOpen && (
        <div className="absolute z-50 w-72 translate-y-1 rounded-md border-[0.078125rem] border-zinc-300 bg-zinc-50 shadow-xl dark:border-zinc-600 dark:bg-zinc-700">
          <AppMenu
            aria-label="Search prefixes"
            onAction={handlePrefixSelect}
            autoFocus="first"
            className="text-xs font-code"
            onClose={() => setIsOpen(false)}
          >
            {SEARCH_PREFIX_ITEMS.map((item) => (
              <AppMenuItem key={item.id} id={item.id}>
                {item.label}
              </AppMenuItem>
            ))}
          </AppMenu>
        </div>
      )}*/}
    </div>
  );
}
