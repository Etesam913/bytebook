import { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue, useStore } from 'jotai';
import { Autocomplete } from 'react-aria-components/Autocomplete';
import { Dialog as AriaDialog } from 'react-aria-components/Dialog';
import { Menu, MenuItem } from 'react-aria-components/Menu';
import { Modal, ModalOverlay } from 'react-aria-components/Modal';
import { Text } from 'react-aria-components/Text';
import {
  backendQueryAtom,
  commandPaletteModeAtom,
  contextMenuDataAtom,
  dialogDataAtom,
  focusTreeFilterInputAtom,
  isFileMaximizedAtom,
  treeFilterQueryAtom,
} from '@/atoms';
import { Tooltip } from '@components/tooltip';
import {
  SEARCH_HELP_SECTIONS,
  SearchHelpSections,
} from '@components/search-help';
import { CircleInfo } from '@/icons/circle-info';
import { AppIconButton, MotionButton } from '@components/buttons';
import { AppSearchField } from '@components/input';
import { SearchExcerpt } from '@components/search-excerpt';
import { RenderNoteIcon } from '@/icons/render-note-icon';
import { useWailsEvent } from '@hooks/events';
import { isEventInCurrentWindow, QUICK_OPEN } from '@utils/events';
import { navigateToPath } from '@utils/routes';
import { usePaletteResults } from './hooks/use-palette-results';

export function CommandPalette() {
  const [mode, setMode] = useAtom(commandPaletteModeAtom);
  const dialog = useAtomValue(dialogDataAtom);
  const backend = useAtomValue(backendQueryAtom);
  const store = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const blocked = dialog.isOpen || backend.isLoading;

  useWailsEvent(QUICK_OPEN, (event) => {
    void (async () => {
      if (!(await isEventInCurrentWindow(event))) return;
      if (
        store.get(dialogDataAtom).isOpen ||
        store.get(backendQueryAtom).isLoading
      )
        return;
      store.set(contextMenuDataAtom, (previous) => ({
        ...previous,
        isShowing: false,
      }));
      setMode(store.get(commandPaletteModeAtom) === null ? 'files' : null);
    })();
  });

  useEffect(() => {
    if (blocked) setMode(null);
  }, [blocked, setMode]);

  useEffect(() => {
    if (mode !== null || !pendingAction.current) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    // Let the closing focus scope restore focus before the next surface takes it.
    const frame = requestAnimationFrame(action);
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  function closeAndRun(action: () => void) {
    pendingAction.current = action;
    setMode(null);
  }

  if (mode === null || blocked) return null;
  return (
    <ModalOverlay
      isOpen
      isDismissable
      onOpenChange={(open) => {
        if (!open) setMode(null);
      }}
      className="fixed inset-0 z-60 bg-black/40 flex items-start justify-center pt-[min(15vh,8rem)] px-4"
    >
      <Modal className="w-[min(40rem,90vw)] outline-none">
        <AriaDialog
          aria-label="Quick Open"
          className="rounded-xl border border-zinc-300 bg-zinc-50 shadow-2xl outline-none dark:border-zinc-700 dark:bg-zinc-800"
        >
          <div
            onKeyDownCapture={(event) => {
              if (event.key === 'Backspace' || event.key === 'Delete') {
                // Keep editing keys out of Autocomplete's synthetic menu events.
                event.stopPropagation();
                if (
                  !(
                    event.target instanceof HTMLInputElement ||
                    event.target instanceof HTMLTextAreaElement
                  )
                ) {
                  event.preventDefault();
                }
              }
              if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.stopPropagation();
                setMode(null);
              }
            }}
          >
            <PaletteBody inputRef={inputRef} closeAndRun={closeAndRun} />
          </div>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

function PaletteBody({
  inputRef,
  closeAndRun,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  closeAndRun: (action: () => void) => void;
}) {
  const [query, setQuery] = useState('');
  const helpRoot = useRef<HTMLDivElement>(null);
  const { items, search } = usePaletteResults(query);
  const store = useStore();

  return (
    <div ref={helpRoot}>
      <Autocomplete inputValue={query} onInputChange={setQuery}>
        <AppSearchField
          ref={inputRef}
          autoFocus
          aria-label="Search notes and attachments"
          placeholder="Search notes…  f:filename, #tag, or a phrase"
          maxLength={512}
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          className="m-2"
          inputClassName="pr-8"
          suffix={
            <Tooltip
              root={helpRoot}
              placement="bottom"
              content={<SearchHelpSections sections={SEARCH_HELP_SECTIONS} />}
            >
              <AppIconButton
                slot={null}
                aria-label="Search syntax help"
                className="p-0.5 text-zinc-500 dark:text-zinc-400"
              >
                <CircleInfo width="0.875rem" height="0.875rem" />
              </AppIconButton>
            </Tooltip>
          }
        />
        <Menu
          autoFocus="first"
          aria-label="Search results"
          aria-busy={search.isSearching}
          items={items}
          className="max-h-[50vh] overflow-y-auto px-2 pb-2 outline-none"
          onAction={(id) => {
            const item = items.find((item) => item.id === id);
            if (!item) return;
            closeAndRun(() => navigateToPath(item.action.path));
          }}
          renderEmptyState={() => (
            <p className="px-2 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              {search.isError
                ? 'Search is unavailable.'
                : query.trim()
                  ? 'No results found.'
                  : 'Your recent files will appear here. Type to search.'}
            </p>
          )}
        >
          {(item) => (
            <MenuItem
              id={item.id}
              textValue={item.label}
              className="group flex items-center gap-1.5 rounded-md px-2 py-1 outline-none data-[focused]:bg-(--accent-color) data-[focused]:text-white"
              aria-label={`${item.label} in ${item.description}`}
            >
              <RenderNoteIcon filePath={item.action.path} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <Text
                    slot="label"
                    className="min-w-0 flex-1 truncate text-sm leading-5"
                    title={item.action.path.fullPath}
                  >
                    {item.label}
                  </Text>
                  <Text
                    slot="description"
                    className="max-w-[45%] truncate text-xs text-zinc-500 dark:text-zinc-400 group-data-[focused]:text-white/85"
                  >
                    {item.description}
                  </Text>
                </div>
                {item.excerpt && (
                  <div className="truncate text-xs leading-4">
                    <SearchExcerpt html={item.excerpt} />
                  </div>
                )}
              </div>
            </MenuItem>
          )}
        </Menu>
      </Autocomplete>
      <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <span>↑↓ Navigate · Enter Open · Esc Close</span>
        {search.isError && (
          <MotionButton
            className="px-1.5 py-0.5 text-xs"
            onPress={() => void search.refetch()}
            isDisabled={search.isSearching}
          >
            Retry
          </MotionButton>
        )}
        {search.data?.hasMore && (
          <MotionButton
            isDisabled={search.isSearching}
            className="px-1.5 py-0.5 text-xs"
            onPress={() =>
              closeAndRun(() => {
                store.set(treeFilterQueryAtom, query);
                store.set(isFileMaximizedAtom, false);
                store.set(focusTreeFilterInputAtom);
              })
            }
          >
            Search all results
          </MotionButton>
        )}
      </div>
    </div>
  );
}
