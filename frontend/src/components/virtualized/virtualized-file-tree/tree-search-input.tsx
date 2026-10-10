import { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  fileSidebarOpenStateAtom,
  isFileMaximizedAtom,
  treeFilterFocusSignalAtom,
} from '@/atoms';
import { AppIconButton } from '@components/buttons';
import { AppSearchField } from '@components/input';
import {
  SEARCH_HELP_SECTIONS,
  SearchHelpSections,
} from '@components/search-help';
import { Tooltip } from '@components/tooltip';
import { CircleInfo } from '@/icons/circle-info';
import { useCurrentWindowWailsEvent } from '@hooks/events';
import { FILE_TREE_FILTER_FOCUS } from '@utils/events';

// The tree filter reuses the search syntax, but result ordering is fixed, so
// the Sort examples don't apply here.
const FILTER_HELP_SECTIONS = SEARCH_HELP_SECTIONS.filter(
  (section) => section.label !== 'Sort'
);

export function TreeSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setIsFileMaximized = useSetAtom(isFileMaximizedAtom);
  const setOpenState = useSetAtom(fileSidebarOpenStateAtom);
  const focusSignal = useAtomValue(treeFilterFocusSignalAtom);
  const lastFocusSignalRef = useRef(focusSignal);

  const focusInput = () => {
    setIsFileMaximized(false);
    setOpenState((prev) => ({ ...prev, files: true }));
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  useEffect(() => {
    // Reordering can replay effects in StrictMode without a new focus request.
    if (lastFocusSignalRef.current === focusSignal) return;
    lastFocusSignalRef.current = focusSignal;
    focusInput();
  }, [focusSignal]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'f'
      ) {
        event.preventDefault();
        focusInput();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useCurrentWindowWailsEvent(FILE_TREE_FILTER_FOCUS, () => {
    focusInput();
  });

  return (
    <div className="pl-2 pr-2 pb-1.5 w-full">
      <AppSearchField
        ref={inputRef}
        aria-label="Filter files"
        placeholder="Filter files (⌘⇧F)"
        value={value}
        onChange={onChange}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        inputClassName="pr-8 [&::-webkit-search-cancel-button]:ml-2"
        // SearchField clears on Escape by itself; only the blur is app behaviour.
        onClear={() => inputRef.current?.blur()}
        suffix={
          <Tooltip
            placement="right"
            content={<SearchHelpSections sections={FILTER_HELP_SECTIONS} />}
          >
            <AppIconButton
              aria-label="Filter syntax help"
              className="p-0.5 text-zinc-500 dark:text-zinc-400"
            >
              <CircleInfo width="0.875rem" height="0.875rem" />
            </AppIconButton>
          </Tooltip>
        }
      />
    </div>
  );
}
