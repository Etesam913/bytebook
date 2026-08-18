import type { FileTree as PierreFileTree } from '@pierre/trees';
import { useEffect, useRef, useState } from 'react';
import { AppSearchField } from '../../input';

export function TreeSearchInput({ model }: { model: PierreFileTree }) {
  const [searchQuery, setSearchQuery] = useState('');
  // The model emits synchronously when search state changes, before React re-renders,
  // so the subscriber below must read the query from a ref (state would be stale).
  const searchQueryRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return model.subscribe(() => {
      // The tree unconditionally closes search on row click / Enter / Escape.
      // If it closed search while the user still has an active query, restore it
      // to keep results visible. User-initiated clears update the ref first, so
      // they are never restored.
      if (searchQueryRef.current && !model.getSearchValue()) {
        model.setSearch(searchQueryRef.current);
      }
    });
  }, [model]);

  function handleSearchChange(value: string) {
    searchQueryRef.current = value;
    setSearchQuery(value);
    model.setSearch(value || null);
  }

  return (
    <div className="px-2 pb-1.5 w-full">
      <AppSearchField
        ref={inputRef}
        aria-label="Filter files"
        placeholder="Filter files..."
        value={searchQuery}
        onChange={handleSearchChange}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            handleSearchChange('');
            inputRef.current?.blur();
          }
        }}
      />
    </div>
  );
}
