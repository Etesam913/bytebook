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
import { mostRecentNotesAtom } from '../../../atoms';
import { WAILS_URL } from '../../../utils/general';
import { convertFilePathToQueryNotation } from '../../../utils/string-formatting';
import { LocalFilePath } from '../../../utils/path';
import {
  DropdownPickerOption,
  FilePickerMenuItem,
  type FilePickerMenuItemData,
} from '../../dropdown/dropdown-picker';
import { $createLinkNode } from '../nodes/link';
import { INSERT_FILES_COMMAND } from './file';
import { RenderNoteIcon } from '../../../icons/render-note-icon';

type FilePickerOption = FilePickerMenuItemData & {
  dropdownOption: DropdownPickerOption;
};

type FileResultOption = Extract<FilePickerMenuItemData, { kind: 'file' }>;

export function FilePickerMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('@', {
    minLength: 0,
    punctuation: '',
  });
  const mostRecentNotes = useAtomValue(mostRecentNotesAtom);
  const { data: searchResults } = useQuery({
    queryKey: ['file-picker-search', searchQuery],
    queryFn: () => SearchFileNamesFromQuery(searchQuery ?? ''),
  });

  const insertLink = (text: string, url: string) => {
    editor.update(() => {
      const linkNode = $createLinkNode(url);
      linkNode.append($createTextNode(text));
      $insertNodes([linkNode]);
    });
  };

  // Getting data into the FilePickerMenuItemData format
  const optionSources: FileResultOption[] = !searchQuery
    ? mostRecentNotes.map((filePath) => ({ kind: 'file', filePath }))
    : (searchResults ?? []).flatMap((result): FileResultOption[] => {
        if (!result.note) return [];
        try {
          return [
            {
              kind: 'file',
              filePath: new LocalFilePath({
                folder: result.folder,
                note: result.note,
              }),
            },
          ];
        } catch {
          return [];
        }
      });

  const options: FilePickerOption[] = optionSources.map((item) => {
    const label = item.filePath.toString();

    return {
      ...item,
      dropdownOption: new DropdownPickerOption(label, {
        icon: <RenderNoteIcon filePath={item.filePath} size="sm" />,
        onSelect: () => {
          const fullPath = item.filePath.toString();
          if (item.filePath.noteExtension === 'md') {
            insertLink(
              fullPath,
              `${WAILS_URL}/${convertFilePathToQueryNotation(fullPath)}`
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
          <ul className="fixed z-10 flex overflow-y-auto overflow-x-hidden text-nowrap flex-col max-h-64 gap-0.5 w-64 p-1 shadow-xl rounded-md border-[1.25px] border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 scroll-p-1 text-zinc-950 dark:text-zinc-100">
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
