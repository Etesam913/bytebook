import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai/react';
import {
  $createTextNode,
  $insertNodes,
  COMMAND_PRIORITY_NORMAL,
  type TextNode,
} from 'lexical';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SearchFileNamesFromQuery } from '../../../../bindings/github.com/etesam913/bytebook/internal/services/searchservice';
import { mostRecentItemsAtom } from '../../../atoms';
import { WAILS_URL } from '../../../utils/general';
import { createFilePath } from '../../../utils/path';
import {
  DropdownPickerOption,
  FilePickerMenuItem,
  type FilePickerMenuItemData,
} from '../../dropdown/dropdown-picker';
import { $createLinkNode } from '../nodes/link';
import { INSERT_FILES_COMMAND } from './file';
import { RenderNoteIcon } from '../../../icons/render-note-icon';
import { FILE_TYPE } from '../../virtualized/virtualized-file-tree/types';

type FilePickerOption = FilePickerMenuItemData & {
  dropdownOption: DropdownPickerOption;
};

type FileResultOption = Extract<FilePickerMenuItemData, { kind: 'file' }>;

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
  const { data: searchResults } = useQuery({
    queryKey: ['file-picker-search', searchQuery],
    queryFn: () => SearchFileNamesFromQuery(searchQuery ?? ''),
  });

  const insertLink = (text: string, url: string) => {
    editor.update(() => {
      console.log({ url });
      const linkNode = $createLinkNode(url);
      linkNode.append($createTextNode(text));
      $insertNodes([linkNode]);
    });
  };

  // Getting data into the FilePickerMenuItemData format
  const optionSources: FileResultOption[] = !searchQuery
    ? mostRecentItems.flatMap((recentItem): FileResultOption[] =>
        recentItem.type === FILE_TYPE
          ? [{ kind: 'file', filePath: recentItem }]
          : []
      )
    : (searchResults ?? []).flatMap((result): FileResultOption[] => {
        if (!result.note) return [];
        const filePath = createFilePath(`${result.folder}/${result.note}`);
        return filePath ? [{ kind: FILE_TYPE, filePath }] : [];
      });

  const options: FilePickerOption[] = optionSources.map((item) => {
    const label = item.filePath.fullPath;
    const filePathForIcon = item.filePath;

    return {
      ...item,
      dropdownOption: new DropdownPickerOption(label, {
        icon: filePathForIcon ? (
          <RenderNoteIcon filePath={filePathForIcon} size="sm" />
        ) : undefined,
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
        if (!anchorElementRef.current || options.length === 0) {
          return null;
        }

        return createPortal(
          <ul
            className="fixed z-10 flex overflow-y-auto overflow-x-hidden text-nowrap flex-col max-h-64 gap-0.5 w-64 p-1 shadow-xl rounded-md border-[1.25px] border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 scroll-p-1 text-zinc-950 dark:text-zinc-100"
            style={{
              transform:
                'translateY(calc(var(--editor-font-size) * 1.5 + 0.375rem))',
            }}
          >
            {options.map((option, i) => (
              <FilePickerMenuItem
                key={option.dropdownOption.key}
                index={i}
                isSelected={selectedIndex === i}
                onClick={() => selectOptionAndCleanUp(option.dropdownOption)}
                option={option.dropdownOption}
                item={option}
              />
            ))}
          </ul>,
          anchorElementRef.current
        );
      }}
    />
  );
}
