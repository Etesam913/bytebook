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
import { SearchFileNamesFromQuery } from '../../../../bindings/github.com/etesam913/bytebook/services/searchservice';
import { mostRecentNotesWithoutQueryParamsAtom } from '../../../atoms';
import { RenderNoteIcon } from '../../../routes/notes-sidebar/render-note-icon';
import { FILE_SERVER_URL } from '../../../utils/general';
import { getFileExtension } from '../../../utils/string-formatting';
import {
  DropdownPickerOption,
  FilePickerMenuItem,
} from '../../dropdown/dropdown-picker';
import type { FilePayload } from '../nodes/file';
import { $createLinkNode } from '../nodes/link';
import { INSERT_FILES_COMMAND } from './file';

const MAX_VISIBLE_SEARCH_RESULTS = 20;

export function FilePickerMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('@', {
    minLength: 0,
  });
  const mostRecentNotes = useAtomValue(mostRecentNotesWithoutQueryParamsAtom);
  const { data: searchResults } = useQuery({
    queryKey: ['file-picker-search', searchQuery],
    queryFn: async () => {
      return await SearchFileNamesFromQuery(searchQuery ?? '');
    },
  });
  const options = (!searchQuery ? mostRecentNotes : (searchResults ?? []))
    .slice(0, MAX_VISIBLE_SEARCH_RESULTS)
    .map(
      (fileName) =>
        new DropdownPickerOption(fileName, {
          icon: (
            <RenderNoteIcon
              size="sm"
              fileExtension={getFileExtension(fileName).extension ?? ''}
            />
          ),
          onSelect: () => {
            const { extension, urlWithoutExtension } =
              getFileExtension(fileName);
            if (extension === 'md') {
              editor.update(() => {
                const linkNode = $createLinkNode(
                  `wails://localhost:5173/${urlWithoutExtension}?ext=${extension}`
                );

                const linkTextNode = $createTextNode(fileName);
                linkNode.append(linkTextNode);
                $insertNodes([linkNode]);
              });
            } else {
              const payload: FilePayload = {
                src: `${FILE_SERVER_URL}/notes/${fileName}`,
                alt: fileName,
              };
              editor.dispatchCommand(INSERT_FILES_COMMAND, [payload]);
            }
          },
        })
    );

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
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp }
      ) =>
        anchorElementRef.current && options.length
          ? createPortal(
              <ul className="fixed z-10 flex overflow-y-auto overflow-x-hidden text-nowrap flex-col max-h-64 gap-0.5 w-64 p-1 shadow-xl rounded-md border-[1.25px] border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 scroll-p-1 text-zinc-950 dark:text-zinc-100">
                {options.map((option, i: number) => (
                  <FilePickerMenuItem
                    index={i}
                    isSelected={selectedIndex === i}
                    onMouseEnter={() => {}}
                    onClick={() => selectOptionAndCleanUp(option)}
                    key={option.key}
                    option={option}
                  />
                ))}
              </ul>,
              anchorElementRef.current
            )
          : null
      }
    />
  );
}
