import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_NORMAL,
  type LexicalEditor,
  type TextNode,
} from 'lexical';
import { type JSX, useState } from 'react';
import { useAtomValue } from 'jotai/react';
import { createPortal } from 'react-dom';
import { projectSettingsAtom } from '@/atoms';
import { useAttachmentsMutation } from '@hooks/attachments';
import { useCreateTableDialog } from '@hooks/dialogs';
import { GolangLogo } from '@/icons/golang-logo';
import { JavaLogo } from '@/icons/java-logo';
import { PythonLogo } from '@/icons/python-logo';
import { Text } from '@/icons/text';
import {
  ComponentPickerMenuItem,
  DropdownPickerOption,
} from '@components/dropdown/dropdown-picker';
import {
  attachmentCommandData,
  changeSelectedBlocksType,
  listCommandData,
} from '../utils/toolbar';
import { headingOptions } from '../utils/heading-options';
import { INSERT_CODE_COMMAND } from './code';
import { LANGUAGES, Languages } from '@/types';
import { getDefaultCodeForLanguage } from '@utils/code';
import { JavascriptLogo } from '@/icons/javascript-logo';
import { Table } from '@/icons/table';
import { QuoteIcon } from '@/icons/quote';
import { SquareCode } from '@/icons/square-code';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { DividerYDotted } from '@/icons/divider-y-dotted';

const languageCommandData: {
  languageName: Languages;
  name: string;
  keywords: string[];
  icon?: JSX.Element;
}[] = [
  {
    languageName: LANGUAGES.TEXT,
    keywords: ['text', 'plain', 'plaintext', 'txt'],
    icon: <SquareCode />,
    name: 'Text',
  },
  {
    languageName: LANGUAGES.GO,
    keywords: ['go', 'golang', 'google'],
    icon: <GolangLogo />,
    name: 'Go',
  },
  {
    languageName: LANGUAGES.PYTHON,
    keywords: ['python', 'py'],
    icon: <PythonLogo />,
    name: 'Python',
  },
  {
    languageName: LANGUAGES.JAVASCRIPT,
    keywords: ['javascript', 'js'],
    icon: <JavascriptLogo />,
    name: 'Javascript',
  },
  {
    languageName: LANGUAGES.JAVA,
    keywords: ['java', 'jjava'],
    icon: <JavaLogo />,
    name: 'Java',
  },
];
/**
 * Generates a list of base options for the dropdown picker menu in the Lexical editor.
 *
 * @param  editor - The Lexical editor instance.
 * @param insertAttachmentsMutation - Mutation hook for inserting attachments.
 * @returns Array of dropdown picker options.
 */
function getBaseOptions({
  editor,
  insertAttachmentsMutation,
  openCreateTableDialog,
  defaultCodeBlockLanguage,
}: {
  editor: LexicalEditor;
  insertAttachmentsMutation: UseMutationResult<void, Error, void, unknown>;
  openCreateTableDialog: ReturnType<typeof useCreateTableDialog>;
  defaultCodeBlockLanguage: Languages;
}) {
  return [
    new DropdownPickerOption('Paragraph', {
      keywords: ['normal', 'paragraph', 'p', 'text'],
      icon: <Text width="1.25rem" />,
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        }),
    }),
    new DropdownPickerOption('Quote', {
      keywords: ['quote', 'blockquote', 'quotation', 'citation'],
      icon: <QuoteIcon width="1.25rem" height="1.25rem" />,
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode());
          }
        }),
    }),
    ...headingOptions.map(
      ({ tag, Icon }) =>
        new DropdownPickerOption(`Heading ${tag.slice(1)}`, {
          icon: <Icon />,
          keywords: ['heading', 'header', tag],
          onSelect: () =>
            changeSelectedBlocksType({
              editor,
              newBlockType: tag,
              insertAttachmentsMutation,
            }),
        })
    ),
    ...listCommandData.map(({ block, icon, command, title, keywords }) => {
      return new DropdownPickerOption(title, {
        icon,
        keywords: [...keywords, 'list', block, title],
        onSelect: () => {
          editor.update(() => {
            editor.dispatchCommand(command, undefined);
          });
        },
      });
    }),
    new DropdownPickerOption('Table', {
      icon: <Table />,
      keywords: ['table', 'grid', 'data'],
      onSelect: () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          openCreateTableDialog(editor, selection);
        }
      },
    }),
    new DropdownPickerOption('Line Break', {
      icon: <DividerYDotted />,
      keywords: ['break', 'line', 'divider', 'horizontal'],
      onSelect: () => {
        editor.update(() => {
          editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
        });
      },
    }),
    new DropdownPickerOption('Attachments', {
      icon: attachmentCommandData.icon,
      keywords: [
        'image',
        'picture',
        'video',
        'file',
        'clip',
        attachmentCommandData.block,
        'picture',
      ],
      onSelect: () => {
        insertAttachmentsMutation.mutate();
      },
    }),
    new DropdownPickerOption('Code Block', {
      icon: <SquareCode />,
      keywords: ['code', 'codeblock', 'block', 'snippet', 'syntax'],
      onSelect: () => {
        editor.update(() => {
          editor.dispatchCommand(INSERT_CODE_COMMAND, {
            id: crypto.randomUUID(),
            language: defaultCodeBlockLanguage,
            code: getDefaultCodeForLanguage(defaultCodeBlockLanguage),
            isCreatedNow: true,
          });
        });
      },
    }),
    ...languageCommandData.map(
      ({ languageName, keywords, icon, name }) =>
        new DropdownPickerOption(name, {
          icon,
          keywords: [...keywords, 'code', 'syntax', 'programming', 'language'],
          onSelect: () => {
            editor.update(() => {
              editor.dispatchCommand(INSERT_CODE_COMMAND, {
                id: crypto.randomUUID(),
                language: languageName,
                code: getDefaultCodeForLanguage(languageName),
                isCreatedNow: true,
              });
            });
          },
        })
    ),
  ];
}

export function ComponentPickerMenuPlugin({
  folder,
}: {
  folder: string;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);
  const projectSettings = useAtomValue(projectSettingsAtom);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
    allowWhitespace: true,
  });

  const { insertAttachmentsMutation } = useAttachmentsMutation({
    folder,
    editor,
  });

  const openCreateTableDialog = useCreateTableDialog();

  const getOptions = () => {
    const baseOptions = getBaseOptions({
      editor,
      insertAttachmentsMutation,
      openCreateTableDialog,
      defaultCodeBlockLanguage: projectSettings.code.codeBlockDefaultLanguage,
    });

    if (!queryString) {
      return baseOptions;
    }

    const regex = new RegExp(queryString, 'i');

    return [
      ...baseOptions.filter(
        (option) =>
          regex.test(option.title) ||
          option.keywords.some((keyword) => regex.test(keyword))
      ),
    ];
  };

  const options = getOptions();

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
    <LexicalTypeaheadMenuPlugin<DropdownPickerOption>
      onQueryChange={setQueryString}
      commandPriority={COMMAND_PRIORITY_NORMAL}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) =>
        anchorElementRef.current && options.length
          ? createPortal(
              <ul
                role="listbox"
                aria-label="Insert element"
                className="flex overflow-y-auto overflow-x-hidden text-nowrap flex-col max-h-56 gap-0.5 w-48 p-1 shadow-xl rounded-md border-[1.25px] border-zinc-300 bg-zinc-50/92.5 dark:border-zinc-600 dark:bg-zinc-700/92.5 scroll-p-1 text-zinc-950 dark:text-zinc-100"
              >
                {options.map((option, i: number) => (
                  <ComponentPickerMenuItem
                    index={i}
                    isSelected={selectedIndex === i}
                    onMouseEnter={() => setHighlightedIndex(i)}
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
