import { useRef, useState } from 'react';
import { Autocomplete } from 'react-aria-components/Autocomplete';
import { Collection } from 'react-aria-components/Collection';
import { Header } from 'react-aria-components/Header';
import { Menu, MenuItem, MenuSection } from 'react-aria-components/Menu';
import { Text } from 'react-aria-components/Text';
import type { PaletteItem } from '@/types';
import { Tooltip } from '@components/tooltip';
import {
  SEARCH_HELP_SECTIONS,
  SearchHelpSections,
} from '@components/search-help';
import { CircleInfo } from '@/icons/circle-info';
import { AppIconButton, MotionButton } from '@components/buttons';
import { AppSearchField } from '@components/input';
import { SearchExcerpt } from '@components/search-excerpt';
import { Folder } from '@/icons/folder';
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
    mode === 'files'
      ? files
      : [...commands.items, ...commands.noteItems, ...commands.savedItems];

  return (
    <div
      ref={helpRoot}
      onKeyDownCapture={(event) => {
        if (
          !event.metaKey ||
          event.nativeEvent.isComposing ||
          (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')
        )
          return;

        // Map Cmd+Up/Down to Home/End so Autocomplete moves the highlight to
        // the first/last result and scrolls it into view. Stop the original
        // arrow event to prevent an additional one-row move.
        event.preventDefault();
        event.stopPropagation();
        event.target.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: event.key === 'ArrowUp' ? 'Home' : 'End',
            bubbles: true,
            cancelable: true,
          })
        );
      }}
    >
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
              : 'Search commands'
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
          shouldFocusWrap={false}
          aria-label="Search results"
          aria-busy={search.isSearching}
          className="max-h-[50vh] overflow-y-auto px-2 pb-2 outline-none"
          onAction={(id) => {
            const item = items.find((item) => item.id === id);
            if (!item || item.isDisabled) return;
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
              {mode === 'commands' ? (
                'No commands found.'
              ) : search.isError ? (
                <span className="text-red-500 dark:text-red-400">
                  Search is unavailable.
                </span>
              ) : query.trim() ? (
                'No results found.'
              ) : (
                'Your recent files will appear here. Type to search.'
              )}
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
              {commands.noteItems.length > 0 && (
                <MenuSection>
                  <Header className="px-2 pt-2 pb-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Current Note
                  </Header>
                  <Collection items={commands.noteItems}>
                    {(item) => <PaletteResult item={item} />}
                  </Collection>
                </MenuSection>
              )}
              {commands.savedItems.length > 0 && (
                <MenuSection>
                  <Header className="px-2 pt-2 pb-1 text-xs text-zinc-500 dark:text-zinc-400">
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
          className="pr-3 pl-4 pb-2 text-xs text-red-500 dark:text-red-400"
        >
          Saved searches are unavailable.
        </p>
      )}
      {mode === 'files' && search.isError && (
        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          <MotionButton
            className="px-1.5 py-0.5 text-xs"
            onPress={() => void search.refetch()}
            isDisabled={search.isSearching}
          >
            Retry
          </MotionButton>
        </div>
      )}
    </div>
  );
}

function PaletteResult({ item }: { item: PaletteItem }) {
  return (
    <MenuItem
      id={item.id}
      isDisabled={item.isDisabled}
      textValue={item.label}
      className="group data-[disabled]:opacity-50 flex items-center gap-1.5 rounded-md px-2 py-1 outline-none data-[focused]:bg-(--accent-color) data-[focused]:text-white"
      aria-label={
        item.action.kind === 'open-path'
          ? `${item.label} in ${item.description}`
          : item.label
      }
    >
      {item.action.kind === 'open-path' &&
        (item.action.path.type === 'folder' ? (
          <Folder width="1rem" height="1rem" className="shrink-0" />
        ) : (
          <RenderNoteIcon filePath={item.action.path} size="sm" />
        ))}
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
