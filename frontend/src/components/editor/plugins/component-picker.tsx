import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  $createParagraphNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  COMMAND_PRIORITY_NORMAL,
  type LexicalEditor,
  type TextNode,
} from 'lexical';
import { type JSX, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAttachmentsMutation } from '../../../hooks/attachments';
import { useCreateTableDialog } from '../../../hooks/dialogs';
import { GolangLogo } from '../../../icons/golang-logo';
import { Heading1 } from '../../../icons/heading-1';
import { Heading2 } from '../../../icons/heading-2';
import { Heading3 } from '../../../icons/heading-3';
import { Heading4 } from '../../../icons/heading-4';
import { Heading5 } from '../../../icons/heading-5';
import { Heading6 } from '../../../icons/heading-6';
import { JavaLogo } from '../../../icons/java-logo';
import { Equation } from '../../../icons/equation';
import { PythonLogo } from '../../../icons/python-logo';
import { Text } from '../../../icons/text';
import {
  ComponentPickerMenuItem,
  DropdownPickerOption,
} from '../../dropdown/dropdown-picker';
import { $createInlineEquationNode } from '../nodes/inline-equation';
import { attachmentCommandData, listCommandData } from '../utils/toolbar';
import { INSERT_CODE_COMMAND } from './code';
import { Languages } from '../../../types';
import { getDefaultCodeForLanguage } from '../../../utils/code';
import { JavascriptLogo } from '../../../icons/javascript-logo';
import { Table } from '../../../icons/table';
import { QuoteIcon } from '../../../icons/quote';

const languageCommandData: {
  languageName: Languages;
  name: string;
  keywords: string[];
  icon?: JSX.Element;
}[] = [
  {
    languageName: 'go',
    keywords: ['go', 'golang', 'google'],
    icon: <GolangLogo />,
    name: 'Go',
  },
  // {
  //   id: 'java',
  //   keywords: ['java', 'coffee'],
  //   icon: <JavaLogo />,
  //   name: 'Java',
  // },
  {
    languageName: 'python',
    keywords: ['python', 'py'],
    icon: <PythonLogo />,
    name: 'Python',
  },
  {
    languageName: 'javascript',
    keywords: ['javascript', 'js'],
    icon: <JavascriptLogo />,
    name: 'Javascript',
  },
  // {
  //   id: 'react',
  //   keywords: ['javascript', 'react', 'jsx'],
  //   icon: <ReactLogo />,
  //   name: 'React',
  // },
  // { id: 'rust', keywords: ['rust', 'rs'], icon: <RustLogo />, name: 'Rust' },
  {
    languageName: 'java',
    keywords: ['java', 'jjava'],
    icon: <JavaLogo />,
    name: 'Java',
  },
  // { id: 'c', keywords: ['c', 'c++', 'clang'], icon: <CppLogo />, name: 'C' },
  // {
  //   id: 'angular',
  //   keywords: ['javascript', 'angular', 'js', 'google'],
  //   icon: <AngularLogo />,
  //   name: 'Angular',
  // },
  // {
  //   id: 'vue',
  //   keywords: ['javascript', 'vue', 'js'],
  //   icon: <VueLogo />,
  //   name: 'Vue',
  // },
  // {
  //   id: 'svelte',
  //   keywords: ['javascript', 'svelte', 'js'],
  //   icon: <SvelteLogo height="17" width="17" />,
  //   name: 'Svelte',
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
}: {
  editor: LexicalEditor;
  insertAttachmentsMutation: UseMutationResult<void, Error, void, unknown>;
  openCreateTableDialog: ReturnType<typeof useCreateTableDialog>;
}) {
  return [
    new DropdownPickerOption('Paragraph', {
      keywords: ['normal', 'paragraph', 'p', 'text'],
      icon: <Text width="1.25rem" title="Paragraph" />,
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
      icon: <QuoteIcon width={20} height={20} />,
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode());
          }
        }),
    }),
    ...(
      [
        [1, <Heading1 key={'h1'} />],
        [2, <Heading2 key={'h2'} />],
        [3, <Heading3 key={'h3'} />],
        [4, <Heading4 key={'h4'} />],
        [5, <Heading5 key={'h5'} />],
        [6, <Heading6 key={'h6'} />],
      ] as const
    ).map(
      ([n, icon]) =>
        new DropdownPickerOption(`Heading ${n}`, {
          icon,
          keywords: ['heading', 'header', `h${n}`],
          onSelect: () =>
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createHeadingNode(`h${n}`));
              }
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
      onSelect: async () => {
        insertAttachmentsMutation.mutate();
      },
    }),
    new DropdownPickerOption('Inline Equation', {
      icon: <Equation />,
      keywords: ['inline', 'equation', 'math', 'latex'],
      onSelect: () => {
        editor.update(() => {
          const equationNode = $createInlineEquationNode({
            equation: 'x^2 + y^2 = z^2',
            defaultIsEditing: true,
          });
          $insertNodes([equationNode]);
          // editor.dispatchCommand(FOCUS_NODE_COMMAND, equationNode);
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
  note,
}: {
  folder: string;
  note: string;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  });

  const { insertAttachmentsMutation } = useAttachmentsMutation({
    folder,
    note,
    editor,
  });

  const openCreateTableDialog = useCreateTableDialog();

  const getOptions = () => {
    const baseOptions = getBaseOptions({
      editor,
      insertAttachmentsMutation,
      openCreateTableDialog,
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
        { selectedIndex, selectOptionAndCleanUp }
      ) =>
        anchorElementRef.current && options.length
          ? createPortal(
              <ul className="fixed z-10 flex overflow-auto flex-col max-h-56 gap-0.5 w-48 p-1 shadow-xl rounded-md border-[1.25px] border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 scroll-p-1 text-zinc-950 dark:text-zinc-100">
                {options.map((option, i: number) => (
                  <ComponentPickerMenuItem
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
