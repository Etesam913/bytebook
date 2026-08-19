import { useRef } from 'react';
import { AppSearchField } from '@components/input';

export function TreeSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="px-2 pb-1.5 w-full">
      <AppSearchField
        ref={inputRef}
        aria-label="Filter files"
        placeholder="Filter files… (#tag, f:, type:)"
        value={value}
        onChange={onChange}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onChange('');
            inputRef.current?.blur();
          }
        }}
      />
    </div>
  );
}
