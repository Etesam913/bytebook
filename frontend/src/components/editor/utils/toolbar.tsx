import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
} from '@lexical/list';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $getNearestNodeOfType } from '@lexical/utils';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  $createParagraphNode,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  RangeSelection,
  type TextFormatType,
} from 'lexical';
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react';
import { toast } from 'sonner';
import { AddAttachments } from '../../../../bindings/github.com/etesam913/bytebook/internal/services/nodeservice';
import { Heading1 } from '../../../icons/heading-1';
import { Heading2 } from '../../../icons/heading-2';
import { Heading3 } from '../../../icons/heading-3';
import { Heading4 } from '../../../icons/heading-4';
import { Heading5 } from '../../../icons/heading-5';
import { Heading6 } from '../../../icons/heading-6';
import { ListCheckbox } from '../../../icons/list-checkbox';
import { OrderedList } from '../../../icons/ordered-list';
import { Paperclip } from '../../../icons/paperclip-2.tsx';
import { Table } from '../../../icons/table';
import { Text } from '../../../icons/text';
import { TextBold } from '../../../icons/text-bold';
import { TextItalic } from '../../../icons/text-italic';
import { TextStrikethrough } from '../../../icons/text-strikethrough';
import { UnorderedList } from '../../../icons/unordered-list';
import type {
  DropdownItem,
  EditorBlockTypes,
  FloatingDataType,
} from '../../../types';
import { FILE_SERVER_URL } from '../../../utils/general.ts';
import type { FilePayload } from '../nodes/file';
import { INSERT_FILES_COMMAND } from '../plugins/file';
import { QuoteIcon } from '../../../icons/quote.tsx';

/**
 * Handles the click event on toolbar block elements.
 * If the clicked block type matches the current block type, it converts the block to a paragraph.
 * Otherwise, it applies the appropriate list command based on the block type.
 *
 * @param editor - The LexicalEditor instance
 * @param block - The block type to be applied ('ul', 'ol', or 'check')
 * @param currentBlockType - The current block type
 */
export function handleToolbarBlockElementClick({
  editor,
  block,
  currentBlockType,
  setCurrentBlockType,
}: {
  editor: LexicalEditor;
  block: string;
  currentBlockType: EditorBlockTypes;
  setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>;
}) {
  if (currentBlockType === block) {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  } else {
    setCurrentBlockType(block);
    switch (block) {
      case 'ul':
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        break;
      case 'ol':
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        break;
      case 'check':
        editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
        break;
    }
  }
}

/**
 * Handles the click event for text formatting buttons in the toolbar.
 * This function toggles the given text format in the current selection.
 * If the format is already applied, it removes it; otherwise, it adds it.
 *
 * @param currentSelectionFormat - Array of currently applied text formats
 * @param setCurrentSelectionFormat - Function to update the current selection format
 * @param textFormat - The text format to toggle (e.g., 'bold', 'italic', etc.)
 */
export function handleToolbarTextFormattingClick({
  editor,
  currentSelectionFormat,
  setCurrentSelectionFormat,
  textFormat,
}: {
  editor: LexicalEditor;
  currentSelectionFormat: TextFormatType[];
  setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>;
  textFormat: TextFormatType;
}) {
  editor.dispatchCommand(FORMAT_TEXT_COMMAND, textFormat);
  if (currentSelectionFormat.includes(textFormat)) {
    setCurrentSelectionFormat(
      currentSelectionFormat.filter((format) => format !== textFormat)
    );
  } else {
    setCurrentSelectionFormat([...currentSelectionFormat, textFormat]);
  }
}

/**
 * Gets a selection and formats the blocks to `newBlockType`
 */
export function changeSelectedBlocksType({
  editor,
  newBlockType,
  insertAttachmentsMutation,
  openCreateTableDialog,
}: {
  editor: LexicalEditor;
  newBlockType: EditorBlockTypes;
  insertAttachmentsMutation: UseMutationResult<void, Error, void, unknown>;
  openCreateTableDialog?:
    | ((editor: LexicalEditor, editorSelection: RangeSelection | null) => void)
    | undefined;
}) {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      switch (newBlockType) {
        case 'paragraph':
          $setBlocksType(selection, () => $createParagraphNode());
          break;
        case 'h1':
          $setBlocksType(selection, () => $createHeadingNode('h1'));
          break;
        case 'h2':
          $setBlocksType(selection, () => $createHeadingNode('h2'));
          break;
        case 'h3':
          $setBlocksType(selection, () => $createHeadingNode('h3'));
          break;
        case 'h4':
          $setBlocksType(selection, () => $createHeadingNode('h4'));
          break;
        case 'h5':
          $setBlocksType(selection, () => $createHeadingNode('h5'));
          break;
        case 'h6':
          $setBlocksType(selection, () => $createHeadingNode('h6'));
          break;
        case 'quote':
          $setBlocksType(selection, () => $createQuoteNode());
          break;
        case 'ol':
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          break;
        case 'ul':
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          break;
        case 'check':
          editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
          break;
        case 'table':
          if (openCreateTableDialog) {
            openCreateTableDialog(editor, selection);
          } else {
            editor.dispatchCommand(INSERT_TABLE_COMMAND, {
              columns: '2',
              rows: '2',
              includeHeaders: true,
            });
          }
          break;
        case 'attachment': {
          insertAttachmentsMutation.mutate();
          break;
        }
      }
    }
  });
}

export function updateToolbarOnSelectionChange(
  setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>
) {
  const selection = $getSelection();
  if (!selection) return;
  if ($isRangeSelection(selection)) {
    const selectionTextFormats: TextFormatType[] = [];
    const formats: TextFormatType[] = [
      'bold',
      'italic',
      'underline',
      'strikethrough',
    ];
    formats.forEach((format) => {
      if (selection.hasFormat(format)) {
        selectionTextFormats.push(format);
      }
    });

    setCurrentSelectionFormat(selectionTextFormats as TextFormatType[]);
  }
}

/**
 * Looks at the currently selected text and retrieves its block type and text format info.
 * It uses this information and sets some states
 */
export function updateToolbar({
  editor,
  setDisabled,
  setCurrentSelectionFormat,
  setCurrentBlockType,
  setNoteSelection,
  setFloatingData,
  noteContainerRef,
}: {
  editor: LexicalEditor;
  setDisabled: Dispatch<SetStateAction<boolean>>;
  setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>;
  setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>;
  setNoteSelection: Dispatch<SetStateAction<BaseSelection | null>>;
  setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
  noteContainerRef: RefObject<HTMLDivElement | null>;
}) {
  const selection = $getSelection();
  setNoteSelection(selection);

  if ($isRangeSelection(selection)) {
    setDisabled(false);
    // Shows the text-format hover container
    const selectionText = selection.getTextContent().trim();
    if (selectionText.length > 0) {
      const nativeSelection = window.getSelection()?.getRangeAt(0);
      const domRect = nativeSelection?.getBoundingClientRect();
      if (domRect) {
        const { top: topOfSelectionToWindow, left } = domRect;
        const noteContainerBounds =
          noteContainerRef.current?.getBoundingClientRect();
        const topOfScrollContainerToWindow = noteContainerBounds?.top ?? 0;
        const scrollYOfScrollContainer =
          noteContainerRef.current?.scrollTop ?? 0;

        setFloatingData({
          isOpen: true,
          top:
            topOfSelectionToWindow -
            topOfScrollContainerToWindow +
            scrollYOfScrollContainer -
            80,
          left: left - (noteContainerBounds?.left ?? 0),
          type: 'text-format',
          previousSelection: null,
        });
      }
    } else {
      setFloatingData((prev) => ({
        ...prev,
        isOpen: false,
        type: null,
        previousSelection: null,
      }));
    }
    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === 'root'
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();
    const elementKey = element.getKey();
    const elementDOM = editor.getElementByKey(elementKey);
    updateToolbarOnSelectionChange(setCurrentSelectionFormat);
    if (!elementDOM) return;

    // Consists of headings like h1, h2, h3, etc.
    if ($isHeadingNode(element)) {
      const headingTag = element.getTag();
      setCurrentBlockType(headingTag);
    }
    // Consists of lists, like ol and ul
    else if ($isListNode(element)) {
      const parentList = $getNearestNodeOfType(anchorNode, ListNode);
      const type = parentList ? parentList.getTag() : element.getTag();
      if (element.getListType() === 'check') {
        setCurrentBlockType('check');
      } else {
        setCurrentBlockType(type);
      }
    }
    // Consists of blocks like paragraph, quote, code, etc.
    else {
      setCurrentBlockType(element.getType());
    }
  } else if ($isNodeSelection(selection)) {
    setFloatingData((prev) => ({
      ...prev,
      isOpen: false,
      type: null,
      previousSelection: null,
    }));
    setDisabled(true);
  }
}

/** Used to add files from local filesystem */
export async function insertAttachmentFromFile({
  folder,
  note,
  editor,
  editorSelection,
}: {
  folder: string;
  note: string;
  editor: LexicalEditor;
  editorSelection: BaseSelection | null;
}) {
  try {
    const { success, message, paths } = await AddAttachments(folder, note);
    if (paths.length === 0) return;

    // Goes through all the files and add them to the editor
    editor.update(() => {
      const payloads: FilePayload[] = paths.map((filePath) => ({
        src: `${FILE_SERVER_URL}/${filePath}`,
        alt: filePath.split('/').at(-1) ?? 'Untitled',
      }));
      if (editorSelection) {
        $setSelection(editorSelection.clone());
        editor.dispatchCommand(INSERT_FILES_COMMAND, payloads);
      }
      if (!success) toast.error(message);
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      toast.error(e.message);
    }
  }
}

/** Used in dropdown for block types */
export const blockTypesDropdownItems: DropdownItem[] = [
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <Heading1 /> Header 1
      </span>
    ),
    value: 'h1',
  },
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <Heading2 /> Header 2
      </span>
    ),
    value: 'h2',
  },
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <Heading3 /> Header 3
      </span>
    ),
    value: 'h3',
  },
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <Heading4 /> Header 4
      </span>
    ),
    value: 'h4',
  },
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <Heading5 /> Header 5
      </span>
    ),
    value: 'h5',
  },
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <Heading6 /> Header 6
      </span>
    ),
    value: 'h6',
  },
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <Text /> Paragraph
      </span>
    ),
    value: 'paragraph',
  },
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <QuoteIcon /> Quote
      </span>
    ),
    value: 'quote',
  },
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <UnorderedList /> Unordered List
      </span>
    ),
    value: 'ul',
  },
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <OrderedList /> Ordered List
      </span>
    ),
    value: 'ol',
  },
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <ListCheckbox /> Checkbox List
      </span>
    ),
    value: 'check',
  },
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <Paperclip /> Attachment
      </span>
    ),
    value: 'attachment',
  },
  {
    label: (
      <span className="flex items-center gap-1.5 will-change-transform">
        <Table /> Table
      </span>
    ),
    value: 'table',
  },
];

export const listCommandData = [
  {
    block: 'ul',
    icon: <UnorderedList className="will-change-transform" />,
    command: INSERT_UNORDERED_LIST_COMMAND,
    title: 'Unordered List',
    keywords: ['bullet', 'unordered', 'ul', 'list'],
    customDisabled: undefined,
  },
  {
    block: 'ol',
    icon: <OrderedList className="will-change-transform" />,
    command: INSERT_ORDERED_LIST_COMMAND,
    title: 'Ordered List',
    keywords: ['numbered', 'ordered', 'ol', 'list'],
    customDisabled: undefined,
  },
  {
    block: 'check',
    icon: <ListCheckbox className="will-change-transform" />,
    command: INSERT_CHECK_LIST_COMMAND,
    title: 'Check List',
    keywords: ['check', 'checkbox', 'todo', 'task', 'list'],
    customDisabled: undefined,
  },
];

export const textFormats: { icon: ReactNode; format: TextFormatType }[] = [
  {
    icon: <TextBold className="will-change-transform" />,
    format: 'bold',
  },
  {
    icon: <TextItalic className="will-change-transform" />,
    format: 'italic',
  },
  {
    icon: <TextStrikethrough className="will-change-transform" />,
    format: 'strikethrough',
  },
];

export const attachmentCommandData = {
  block: 'attachment',
  icon: <Paperclip />,
  command: INSERT_FILES_COMMAND,
};
