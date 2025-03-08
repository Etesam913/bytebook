import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createHeadingNode } from '@lexical/rich-text';
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
import { type JSX, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAttachmentsMutation } from '../../../hooks/attachments';
import { AngularLogo } from '../../../icons/angular-logo';
import { CppLogo } from '../../../icons/cpp-logo';
import { GolangLogo } from '../../../icons/golang-logo';
import { Heading1 } from '../../../icons/heading-1';
import { Heading2 } from '../../../icons/heading-2';
import { Heading3 } from '../../../icons/heading-3';
import { Heading4 } from '../../../icons/heading-4';
import { Heading5 } from '../../../icons/heading-5';
import { Heading6 } from '../../../icons/heading-6';
import { JavaLogo } from '../../../icons/java-logo';
import { JavascriptLogo } from '../../../icons/javascript-logo';

import { Equation } from '../../../icons/equation';
import { Paintbrush } from '../../../icons/paintbrush';
import { PythonLogo } from '../../../icons/python-logo';
import { ReactLogo } from '../../../icons/react-logo';
import { RustLogo } from '../../../icons/rust-logo';
import { SvelteLogo } from '../../../icons/svelte-logo';
import { TerminalIcon } from '../../../icons/terminal';
import { Text } from '../../../icons/text';
import { VueLogo } from '../../../icons/vue-logo';
import {
  ComponentPickerMenuItem,
  DropdownPickerOption,
} from '../../dropdown/dropdown-picker';
import { $createExcalidrawNode } from '../nodes/excalidraw';
import { $createInlineEquationNode } from '../nodes/inline-equation';
import { attachmentCommandData, listCommandData } from '../utils/toolbar';
import { INSERT_CODE_COMMAND } from './code';
import { FOCUS_NODE_COMMAND } from './focus';

const languageCommandData: {
  id:
    | 'go'
    | 'java'
    | 'python'
    | 'javascript'
    | 'react'
    | 'angular'
    | 'vue'
    | 'svelte'
    | 'rust'
    | 'cpp'
    | 'c'
    | 'terminal';
  name: string;
  keywords: string[];
  icon?: JSX.Element;
}[] = [
  {
    id: 'go',
    keywords: ['go', 'google'],
    icon: <GolangLogo />,
    name: 'Golang',
  },
  {
    id: 'java',
    keywords: ['java', 'coffee'],
    icon: <JavaLogo />,
    name: 'Java',
  },
  {
    id: 'python',
    keywords: ['python', 'py'],
    icon: <PythonLogo />,
    name: 'Python',
  },
  {
    id: 'javascript',
    keywords: ['javascript', 'js'],
    icon: <JavascriptLogo />,
    name: 'Javascript',
  },
  {
    id: 'react',
    keywords: ['javascript', 'react', 'jsx'],
    icon: <ReactLogo />,
    name: 'React',
  },
  { id: 'rust', keywords: ['rust', 'rs'], icon: <RustLogo />, name: 'Rust' },
  { id: 'cpp', keywords: ['c++', 'cpp'], icon: <CppLogo />, name: 'C++' },
  { id: 'c', keywords: ['c', 'c++', 'clang'], icon: <CppLogo />, name: 'C' },
  {
    id: 'angular',
    keywords: ['javascript', 'angular', 'js', 'google'],
    icon: <AngularLogo />,
    name: 'Angular',
  },
  {
    id: 'vue',
    keywords: ['javascript', 'vue', 'js'],
    icon: <VueLogo />,
    name: 'Vue',
  },
  {
    id: 'svelte',
    keywords: ['javascript', 'svelte', 'js'],
    icon: <SvelteLogo height="17" width="17" />,
    name: 'Svelte',
  },
  {
    id: 'terminal',
    keywords: ['terminal', 'command', 'prompt', 'bash', 'zsh', 'sh'],
    icon: <TerminalIcon />,
    name: 'Terminal',
  },
];

/**
 * Generates a list of base options for the dropdown picker menu in the Lexical editor.
 *
 * @param  editor - The Lexical editor instance.
 * @param insertAttachmentsMutation - Mutation hook for inserting attachments.
 * @param dialogProps - Properties for dialog management.
 * @param dialogProps.setDialogData - Function to set dialog data.
 * @param dialogProps.editorSelection - Reference to the current editor selection.
 * @returns Array of dropdown picker options.
 */
function getBaseOptions(
  editor: LexicalEditor,
  insertAttachmentsMutation: UseMutationResult<void, Error, void, unknown>
) {
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
    ...listCommandData.map(({ block, icon, command, title }) => {
      return new DropdownPickerOption(title, {
        icon,
        keywords: ['list', block, title],
        onSelect: () => {
          editor.update(() => {
            editor.dispatchCommand(command, undefined);
          });
        },
      });
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
    // new DropdownPickerOption("YouTube", {
    // 	icon: <VideoIcon />,
    // 	keywords: ["youtube", "video", "embed"],
    // 	onSelect: async () => {
    // 		setDialogData({
    // 			isOpen: true,
    // 			isPending: false,
    // 			dialogClassName: "w-[min(30rem,90vw)]",
    // 			title: "YouTube Embed",
    // 			children: (dialogErrorText) => (
    // 				<YouTubeDialogChildren
    // 					editor={editor}
    // 					errorText={dialogErrorText}
    // 					editorSelection={editorSelection}
    // 				/>
    // 			),
    // 			onSubmit: async (e, setDialogErrorText) => {
    // 				try {
    // 					if (
    // 						!editorSelection.current ||
    // 						!$isRangeSelection(editorSelection.current)
    // 					)
    // 						throw new Error("Something went wrong! Please try again.");

    // 					const formData = new FormData(e.target as HTMLFormElement);
    // 					const videoUrl = formData.get("youtube-url");
    // 					// Doing some error checking
    // 					if (
    // 						!videoUrl ||
    // 						typeof videoUrl !== "string" ||
    // 						videoUrl.trim().length === 0
    // 					)
    // 						throw new Error("YouTube URL cannot be empty");
    // 					if (extractYouTubeVideoID(videoUrl) === null)
    // 						throw new Error("Invalid YouTube URL");

    // 					// Got a warning about the old selection being stale, so cloning it fixes it
    // 					const newSelection = editorSelection.current.clone();
    // 					// Using the cloned selection and adding the youtube video
    // 					editor.update(() => {
    // 						$setSelection(newSelection);
    // 						const youtubeVideo = $createFileNode({
    // 							alt: "YouTube Video",
    // 							src: videoUrl,
    // 							width: "100%",
    // 						});
    // 						const youtubeVideoNode = $createParagraphNode();
    // 						youtubeVideoNode.append(youtubeVideo);
    // 						newSelection.insertNodes([youtubeVideoNode]);
    // 						editor.dispatchCommand(SAVE_MARKDOWN_CONTENT, undefined);
    // 					});
    // 					return true;
    // 				} catch (e) {
    // 					if (e instanceof Error) setDialogErrorText(e.message);
    // 					return false;
    // 				}
    // 			},
    // 		});
    // 	},
    // }),
    new DropdownPickerOption('Drawing', {
      icon: <Paintbrush />,
      keywords: [
        'drawing',
        'sketch',
        'doodle',
        'draw',
        'excalidraw',
        'painting',
      ],
      onSelect: () => {
        editor.update(() => {
          const excalidrawNode = $createExcalidrawNode({ elements: [] });
          $insertNodes([excalidrawNode]);
          setTimeout(() => {
            editor.dispatchCommand(FOCUS_NODE_COMMAND, excalidrawNode);
          }, 200);
        });
      },
    }),
    ...languageCommandData.map(
      ({ id, keywords, icon, name }) =>
        new DropdownPickerOption(name, {
          icon,
          keywords: [...keywords, 'code', 'syntax', 'programming', 'language'],
          onSelect: () => {
            editor.update(() => {
              editor.dispatchCommand(INSERT_CODE_COMMAND, {
                language: id,
                shell: 'bash',
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

  const options = useMemo(() => {
    const baseOptions = getBaseOptions(editor, insertAttachmentsMutation);

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
  }, [editor, queryString, folder, note]);

  const onSelectOption = useCallback(
    (
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
    },
    [editor]
  );

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
