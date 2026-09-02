import { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  fileSidebarOpenStateAtom,
  focusTreeFilterInputAtom,
  isFileMaximizedAtom,
} from '@/atoms';
import { AppIconButton } from '@components/buttons';
import { AppSearchField } from '@components/input';
import {
  SEARCH_HELP_SECTIONS,
  SearchHelpSections,
} from '@components/search-help';
import { Tooltip } from '@components/tooltip';
import { CircleInfo } from '@/icons/circle-info';
import { useWailsEvent } from '@hooks/events';
import { FILE_TREE_FILTER_FOCUS, isEventInCurrentWindow } from '@utils/events';

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
  const focusSignal = useAtomValue(focusTreeFilterInputAtom);
  const isInitialMount = useRef(true);

  const focusInput = () => {
    setIsFileMaximized(false);
    setOpenState((prev) => ({ ...prev, files: true }));
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
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

  useWailsEvent(FILE_TREE_FILTER_FOCUS, (data) => {
    void (async () => {
      if (!(await isEventInCurrentWindow(data))) return;
      focusInput();
    })();
  });

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
        inputClassName="pr-8"
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
