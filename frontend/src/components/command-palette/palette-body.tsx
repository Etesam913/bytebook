import { useRef, useState } from 'react';
import { useStore } from 'jotai';
import { Autocomplete } from 'react-aria-components/Autocomplete';
import { Collection } from 'react-aria-components/Collection';
import { Header } from 'react-aria-components/Header';
import { Menu, MenuItem, MenuSection } from 'react-aria-components/Menu';
import { Text } from 'react-aria-components/Text';
import type { PaletteItem } from '@/types';
import {
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
import { navigateToPath } from '@utils/routes';
import { usePaletteResults } from './hooks/use-palette-results';
import { usePaletteCommands } from './hooks/use-palette-commands';

export function PaletteBody({
  mode,
  onCreateNote,
  closeAndRun,
}: {
  mode: 'files' | 'commands';
  onCreateNote: () => void;
  closeAndRun: (action: () => void) => void;
}) {
  const [query, setQuery] = useState('');
  const helpRoot = useRef<HTMLDivElement>(null);
  const { items: files, search } = usePaletteResults(query, mode === 'files');
  const commands = usePaletteCommands(query, onCreateNote);
  const items =
    mode === 'files' ? files : [...commands.items, ...commands.savedItems];
  const store = useStore();

  return (
    <div ref={helpRoot}>
      <Autocomplete inputValue={query} onInputChange={setQuery}>
        <AppSearchField
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
          className="max-h-[50vh] overflow-y-auto px-2 pb-2 outline-none"
          onAction={(id) => {
            const item = items.find((item) => item.id === id);
            if (!item) return;
            const action = item.action;
            switch (action.kind) {
              case 'open-path':
                closeAndRun(() => navigateToPath(action.path));
                break;
              case 'create-note':
                onCreateNote();
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
          {mode === 'files' ? (
            <Collection items={files}>
              {(item) => <PaletteResult item={item} />}
            </Collection>
          ) : (
            <>
              <Collection items={commands.items}>
                {(item) => <PaletteResult item={item} />}
              </Collection>
              {commands.savedItems.length > 0 && (
                <MenuSection>
                  <Header className="px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Saved searches
                  </Header>
                  <Collection items={commands.savedItems}>
                    {(item) => <PaletteResult item={item} />}
                  </Collection>
                </MenuSection>
              )}
            </>
          )}
        </Menu>
      </Autocomplete>
      {mode === 'commands' && commands.savedSearches.isError && (
        <p
          role="status"
          className="px-3 pb-2 text-xs text-zinc-500 dark:text-zinc-400"
        >
          Saved searches are unavailable.
        </p>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <MotionButton className="px-1.5 py-0.5 text-xs" onPress={onCreateNote}>
          New Note…
        </MotionButton>
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

function PaletteResult({ item }: { item: PaletteItem }) {
  return (
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
            className="max-w-[45%] truncate text-xs text-zinc-500 dark:text-zinc-400 group-data-[focused]:text-white/85 dark:group-data-[focused]:text-white/85"
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
  );
}
