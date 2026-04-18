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
import { mostRecentItemsAtom } from '../../../atoms';
import { WAILS_URL } from '../../../utils/general';
import {
  DropdownPickerOption,
  FilePickerMenuItem,
  type FilePickerMenuItemData,
} from '../../dropdown/dropdown-picker';
import { $createLinkNode } from '../nodes/link';
import { INSERT_FILES_COMMAND } from './file';
import { RenderNoteIcon } from '../../../icons/render-note-icon';
import { FILE_TYPE } from '../../virtualized/virtualized-file-tree/types';
import {
  useFilePickerSearchQuery,
  type SearchResult,
} from '../../../hooks/search';
import { useFilePathFromRoute } from '../../../hooks/routes';

type FilePickerOption = {
  item: Extract<FilePickerMenuItemData, { kind: 'file' }>;
  searchResult: SearchResult | null;
  dropdownOption: DropdownPickerOption;
};

// Trim the text preceding the first <mark> so the match stays inside the
// line-clamp window of the narrow file picker. Backs off to a word boundary and
// prefixes a single-char ellipsis when trimming.
function centerHighlightOnMark(html: string, leadingBudget = 30): string {
  const markIdx = html.indexOf('<mark');
  if (markIdx <= leadingBudget) return html;
  let tail = html.slice(markIdx - leadingBudget, markIdx);
  const firstSpace = tail.indexOf(' ');
  if (firstSpace > 0) tail = tail.slice(firstSpace + 1);
  return `…${tail}${html.slice(markIdx)}`;
}

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
  const { data: searchResults, isLoading: isSearchLoading } =
    useFilePickerSearchQuery(searchQuery ?? '');
  const currentFilePath = useFilePathFromRoute();

  const insertLink = (text: string, url: string) => {
    editor.update(() => {
      const linkNode = $createLinkNode(url);
      linkNode.append($createTextNode(text));
      $insertNodes([linkNode]);
    });
  };

  const isCurrentNote = (filePath: { fullPath: string }) =>
    currentFilePath ? currentFilePath.fullPath === filePath.fullPath : false;

  const options: FilePickerOption[] = !searchQuery
    ? mostRecentItems.flatMap((recentItem): FilePickerOption[] => {
        if (recentItem.type !== FILE_TYPE) return [];
        if (isCurrentNote(recentItem)) return [];
        return [
          buildFilePickerOption({
            item: { kind: 'file', filePath: recentItem },
            searchResult: null,
            editor,
            insertLink,
          }),
        ];
      })
    : (searchResults ?? []).flatMap((result): FilePickerOption[] => {
        if (isCurrentNote(result.filePath)) return [];
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
        { selectedIndex, selectOptionAndCleanUp }
      ) => {
        if (!anchorElementRef.current) {
          return null;
        }

        const showEmptyState =
          options.length === 0 && !!searchQuery && !isSearchLoading;

        if (options.length === 0 && !showEmptyState) {
          return null;
        }

        return createPortal(
          <ul className="flex overflow-y-auto overflow-x-hidden text-nowrap flex-col max-h-80 gap-0.5 w-80 p-1 shadow-xl rounded-md border-1 border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 scroll-p-1 text-zinc-950 dark:text-zinc-100">
            {showEmptyState && (
              <li className="px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">
                No results found
              </li>
            )}
            {options.map((option, i) => {
              const firstHighlight =
                option.searchResult?.type === 'note'
                  ? option.searchResult.highlights[0]
                  : undefined;
              const highlightHtml =
                firstHighlight && !firstHighlight.isCode
                  ? centerHighlightOnMark(firstHighlight.content)
                  : undefined;

              return (
                <FilePickerMenuItem
                  key={option.dropdownOption.key}
                  index={i}
                  isSelected={selectedIndex === i}
                  onClick={() => selectOptionAndCleanUp(option.dropdownOption)}
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
