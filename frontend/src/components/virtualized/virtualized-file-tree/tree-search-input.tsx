import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { fileSidebarOpenStateAtom, isFileMaximizedAtom } from '@/atoms';
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'f'
      ) {
        event.preventDefault();
        setIsFileMaximized(false);
        setOpenState((prev) => ({ ...prev, files: true }));
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsFileMaximized, setOpenState]);

  useWailsEvent(FILE_TREE_FILTER_FOCUS, (data) => {
    void (async () => {
      if (!(await isEventInCurrentWindow(data))) return;
      setIsFileMaximized(false);
      setOpenState((prev) => ({ ...prev, files: true }));
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
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
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onChange('');
            inputRef.current?.blur();
          }
        }}
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
