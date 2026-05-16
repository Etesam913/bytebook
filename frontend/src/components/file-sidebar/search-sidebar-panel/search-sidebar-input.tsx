import {
  Dispatch,
  type KeyboardEvent,
  type RefObject,
  SetStateAction,
  useId,
  useState,
} from 'react';
import { AppSearchField } from '../../input';
import type { ComboboxInputProps } from '../../../hooks/combobox';

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
  const [isOpen, setIsOpen] = useState(false);
  const inputId = `search-input-${useId()}`;

  return (
    <div className="p-2 relative">
      <AppSearchField
        ref={inputRef}
        id={inputId}
        type="text"
        placeholder="Search..."
        value={value}
        onChange={(newValue) => {
          setInternalSearchQuery(newValue);
          setIsOpen(shouldShowPrefixDropdown(newValue));
        }}
        onFocus={() => setIsOpen(shouldShowPrefixDropdown(value))}
        onKeyDown={(e) => {
          if (isOpen) {
            if (e.key === 'Escape') {
              e.preventDefault();
              setIsOpen(false);
            }
          }
          onKeyDown(e as unknown as KeyboardEvent<HTMLInputElement>);
        }}
        inputClassName="w-full text-sm py-1.5 px-2 rounded-md font-mono"
        autoFocus
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        inputAttrs={comboboxInputProps}
      />
    </div>
  );
}
