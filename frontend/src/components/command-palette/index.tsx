import { usePaletteCommands } from './hooks/use-palette-commands';
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
import { useWailsEvent, type WailsEvent } from '@hooks/events';
import {
  isEventInCurrentWindow,
  QUICK_OPEN,
  COMMAND_PALETTE_OPEN,
} from '@utils/events';
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

  async function openMode(event: WailsEvent, nextMode: 'files' | 'commands') {
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
    setMode(store.get(commandPaletteModeAtom) === null ? nextMode : null);
  }
  useWailsEvent(QUICK_OPEN, (event) => {
    void openMode(event, 'files');
  });
  useWailsEvent(COMMAND_PALETTE_OPEN, (event) => {
    void openMode(event, 'commands');
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
          aria-label={mode === 'files' ? 'Quick Open' : 'Command Palette'}
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
            <PaletteBody
              key={mode}
              mode={mode}
              onModeChange={setMode}
              inputRef={inputRef}
              closeAndRun={closeAndRun}
            />
          </div>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

function PaletteBody({
  mode,
  inputRef,
  closeAndRun,
}: {
  mode: 'files' | 'commands';
  inputRef: React.RefObject<HTMLInputElement | null>;
  closeAndRun: (action: () => void) => void;
}) {
  const [query, setQuery] = useState('');
  const helpRoot = useRef<HTMLDivElement>(null);
  const { items: files, search } = usePaletteResults(query, mode === 'files');
  const commands = usePaletteCommands(query);
  const items = mode === 'files' ? files : commands;
  const store = useStore();

  return (
    <div ref={helpRoot}>
      <Autocomplete inputValue={query} onInputChange={setQuery}>
        <AppSearchField
          ref={inputRef}
          autoFocus
          aria-label={
            mode === 'files'
              ? 'Search notes and attachments'
              : 'Search commands'
          }
          placeholder={
            mode === 'files'
              ? 'Search notes…  f:filename, #tag, or a phrase'
              : 'Search commands…'
          }
          maxLength={512}
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          className="m-2"
          inputClassName="pr-8"
          suffix={
            mode === 'files' && (
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
            )
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
            const action = item.action;
            switch (action.kind) {
              case 'open-path':
                closeAndRun(() => navigateToPath(action.path));
                break;
              case 'command':
                closeAndRun(action.run);
                break;
            }
          }}
          renderEmptyState={() => (
            <p className="px-2 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              {mode === 'commands'
                ? 'No commands found.'
                : search.isError
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
              aria-label={
                item.action.kind === 'open-path'
                  ? `${item.label} in ${item.description}`
                  : item.label
              }
            >
              {item.action.kind === 'open-path' && (
                <RenderNoteIcon filePath={item.action.path} size="sm" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <Text
                    slot="label"
                    className="min-w-0 flex-1 truncate text-sm leading-5"
                    title={
                      item.action.kind === 'open-path'
                        ? item.action.path.fullPath
                        : item.label
                    }
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
        {mode === 'files' && search.isError && (
          <MotionButton
            className="px-1.5 py-0.5 text-xs"
            onPress={() => void search.refetch()}
            isDisabled={search.isSearching}
          >
            Retry
          </MotionButton>
        )}
        {mode === 'files' && search.data?.hasMore && (
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
