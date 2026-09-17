import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { useAtomValue } from 'jotai/react';
import {
  $createTextNode,
  $insertNodes,
  COMMAND_PRIORITY_NORMAL,
  LexicalEditor,
  type TextNode,
} from 'lexical';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { mostRecentItemsAtom } from '@/atoms';
import { WAILS_URL } from '@utils/general';
import {
  DropdownPickerOption,
  FilePickerMenuItem,
  type FilePickerMenuItemData,
} from '@components/dropdown/dropdown-picker';
import { $createLinkNode } from '@lexical/link';
import { INSERT_FILES_COMMAND } from './file';
import { RenderNoteIcon } from '@/icons/render-note-icon';
import {
  getRecentPickerFiles,
  excludeCurrentFile,
} from '@utils/file-picker-results';
import { useAllPaths } from '@hooks/all-paths';
import { useFileSearchQuery, type SearchResult } from '@hooks/search';
import { useFilePathFromRoute } from '@hooks/routes';

type FilePickerOption = {
  item: Extract<FilePickerMenuItemData, { kind: 'file' }>;
  searchResult: SearchResult | null;
  dropdownOption: DropdownPickerOption;
};

/**
 * The file picker that shows up when @ is typed in the lexical editor
 */
export function FilePickerMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('@', {
    minLength: 0,
    allowWhitespace: true,
    // Allow punctuation in note names (e.g. "ete!sam", "my_note").
    punctuation: '',
  });
  const mostRecentItems = useAtomValue(mostRecentItemsAtom);
  const {
    data: searchPage,
    isSearching: isSearchLoading,
    isError,
    refetch,
  } = useFileSearchQuery({
    query: searchQuery ?? '',
    enabled: searchQuery !== null,
    keepPreviousResults: true,
  });
  const { data: allPaths } = useAllPaths();
  const currentFilePath = useFilePathFromRoute();

  const insertLink = (text: string, url: string) => {
    editor.update(() => {
      const linkNode = $createLinkNode(url);
      linkNode.append($createTextNode(text));
      $insertNodes([linkNode]);
    });
  };

  const options: FilePickerOption[] =
    !searchQuery?.trim() || (!searchPage && isSearchLoading)
      ? getRecentPickerFiles({
          recent: mostRecentItems,
          currentPath: currentFilePath?.fullPath,
          allPaths,
        }).flatMap((recentItem): FilePickerOption[] => {
          return [
            buildFilePickerOption({
              item: { kind: 'file', filePath: recentItem },
              searchResult: null,
              editor,
              insertLink,
            }),
          ];
        })
      : excludeCurrentFile(
          searchPage?.results ?? [],
          currentFilePath?.fullPath
        ).flatMap((result): FilePickerOption[] => {
          return [
            buildFilePickerOption({
              item: { kind: 'file', filePath: result.filePath },
              searchResult: result,
              editor,
              insertLink,
            }),
          ];
        });

  const onSelectOption = (
    selectedOption: DropdownPickerOption,
    nodeToRemove: TextNode | null,
    closeMenu: () => void,
    matchingString: string
  ) => {
    editor.update(() => {
      nodeToRemove?.remove();
      selectedOption.onSelect(matchingString);
      closeMenu();
    });
  };

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setSearchQuery}
      commandPriority={COMMAND_PRIORITY_NORMAL}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options.map((option) => option.dropdownOption)}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) => {
        if (!anchorElementRef.current) {
          return null;
        }

        const isEmpty = options.length === 0 && !isSearchLoading && !isError;
        const showEmptyState = isEmpty && !!searchQuery?.trim();

        if (options.length === 0 && !showEmptyState && !isError) {
          return null;
        }

        return createPortal(
          <ul
            role="listbox"
            aria-label="Link a file"
            aria-busy={isSearchLoading}
            className="flex overflow-y-auto overflow-x-hidden text-nowrap flex-col max-h-80 gap-0.5 w-80 p-1 shadow-xl rounded-md border-1 border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 scroll-p-1 text-zinc-950 dark:text-zinc-100"
          >
            {isError && (
              <li role="alert" className="px-2 py-1 text-sm">
                Could not search notes.{' '}
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void refetch()}
                >
                  Retry
                </button>
              </li>
            )}
            {showEmptyState && (
              <li className="px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">
                No results found...
              </li>
            )}
            {options.map((option, i) => {
              const firstHighlight =
                option.searchResult?.type === 'note'
                  ? option.searchResult.highlights[0]
                  : undefined;
              const highlightHtml =
                firstHighlight && !firstHighlight.isCode
                  ? firstHighlight.content
                  : undefined;

              return (
                <FilePickerMenuItem
                  key={option.dropdownOption.key}
                  index={i}
                  isSelected={selectedIndex === i}
                  onClick={() => selectOptionAndCleanUp(option.dropdownOption)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  option={option.dropdownOption}
                  item={option.item}
                  highlightHtml={highlightHtml}
                />
              );
            })}
          </ul>,
          anchorElementRef.current
        );
      }}
    />
  );
}

function buildFilePickerOption({
  item,
  searchResult,
  editor,
  insertLink,
}: {
  item: Extract<FilePickerMenuItemData, { kind: 'file' }>;
  searchResult: SearchResult | null;
  editor: LexicalEditor;
  insertLink: (text: string, url: string) => void;
}): FilePickerOption {
  const label = item.filePath.fullPath;

  return {
    item,
    searchResult,
    dropdownOption: new DropdownPickerOption(label, {
      icon: <RenderNoteIcon filePath={item.filePath} size="sm" />,
      onSelect: () => {
        const fullPath = item.filePath.fullPath;
        if (item.filePath.extension === 'md') {
          insertLink(
            item.filePath.fullPath,
            `${WAILS_URL}${item.filePath.encodedFileUrl}`
          );
        } else {
          editor.dispatchCommand(INSERT_FILES_COMMAND, [
            {
              src: `/notes/${fullPath}`,
              alt: fullPath,
            },
          ]);
        }
      },
    }),
  };
}
