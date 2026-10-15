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
import { AddAttachments } from '@bindings/services/nodeservice';
import { ListCheckbox } from '@/icons/list-checkbox';
import { OrderedList } from '@/icons/ordered-list';
import { Paperclip } from '@/icons/paperclip-2';
import { Table } from '@/icons/table';
import { Text } from '@/icons/text';
import { UnorderedList } from '@/icons/unordered-list';
import type { DropdownItem, EditorBlockTypes, FloatingDataType } from '@/types';

import { LinkNode, $isAutoLinkNode } from '@lexical/link';
import type { FilePayload } from '../nodes/file';
import { INSERT_FILES_COMMAND } from '../plugins/file';
import { getBackendResponseData } from '@utils/query';
import { QuoteIcon } from '@/icons/quote';
import { headingOptions } from './heading-options';

// Convert viewport bounds to the note container's scrolled coordinate space.
export function getFloatingPosition({
  bounds,
  container,
  edge,
}: {
  bounds: DOMRect;
  container: HTMLElement | null;
  edge: 'top' | 'bottom';
}) {
  const containerBounds = container?.getBoundingClientRect();
  return {
    top:
      bounds[edge] - (containerBounds?.top ?? 0) + (container?.scrollTop ?? 0),
    left: bounds.left - (containerBounds?.left ?? 0) + bounds.width / 2,
  };
}

// Capture the current selection and position for both the toolbar action and Cmd+K.
export function $openLinkEditor({
  editor,
  setFloatingData,
  noteContainerRef,
}: {
  editor: LexicalEditor;
  setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
  noteContainerRef: RefObject<HTMLDivElement | null>;
}): boolean {
  const selection = $getSelection();
  if (!editor.isEditable() || !$isRangeSelection(selection)) return false;
  const anchorLink = $getNearestNodeOfType(
    selection.anchor.getNode(),
    LinkNode
  );
  const focusLink = $getNearestNodeOfType(selection.focus.getNode(), LinkNode);
  const link =
    anchorLink &&
    anchorLink.is(focusLink) &&
    !($isAutoLinkNode(anchorLink) && anchorLink.getIsUnlinked())
      ? anchorLink
      : null;
  const nativeSelection = window.getSelection();
  let bounds = link
    ? editor.getElementByKey(link.getKey())?.getBoundingClientRect()
    : nativeSelection?.rangeCount
      ? nativeSelection.getRangeAt(0).getBoundingClientRect()
      : null;
  // An empty paragraph's collapsed DOM range has a zero rectangle.
  if (!bounds || (bounds.width === 0 && bounds.height === 0)) {
    bounds = editor
      .getElementByKey(selection.anchor.getNode().getKey())
      ?.getBoundingClientRect();
  }
  if (!bounds) return false;
  setFloatingData({
    isOpen: true,
    type: 'link',
    ...getFloatingPosition({
      bounds,
      container: noteContainerRef.current,
      edge: link ? 'bottom' : 'top',
    }),
    previousUrl: link?.getURL(),
    linkNodeKey: link?.getKey(),
    previousSelection: selection.clone(),
  });
  return true;
}

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
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          $setBlocksType(selection, () => $createHeadingNode(newBlockType));
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
        case undefined:
        default:
          break;
      }
    }
  });
}

function updateToolbarOnSelectionChange(
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

    setCurrentSelectionFormat(selectionTextFormats);
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
        setFloatingData({
          isOpen: true,
          ...getFloatingPosition({
            bounds: domRect,
            container: noteContainerRef.current,
            edge: 'top',
          }),
          type: 'text-format',
          previousSelection: null,
        });
      }
    } else {
      const link = $getNearestNodeOfType(selection.anchor.getNode(), LinkNode);
      const element = link && editor.getElementByKey(link.getKey());
      const bounds = element?.getBoundingClientRect();
      if (link && bounds && !($isAutoLinkNode(link) && link.getIsUnlinked())) {
        setFloatingData({
          isOpen: true,
          type: 'link-preview',
          ...getFloatingPosition({
            bounds,
            container: noteContainerRef.current,
            edge: 'bottom',
          }),
          previousUrl: link.getURL(),
          linkNodeKey: link.getKey(),
          previousSelection: null,
        });
      } else {
        setFloatingData((prev) => ({
          ...prev,
          isOpen: false,
          type: null,
          previousSelection: null,
        }));
      }
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
  editor,
  editorSelection,
}: {
  folder: string;
  editor: LexicalEditor;
  editorSelection: BaseSelection | null;
}) {
  // Thrown errors surface as toasts via the global MutationCache onError.
  const paths = (await getBackendResponseData(AddAttachments(folder))) ?? [];
  if (paths.length === 0) return;

  // Goes through all the files and add them to the editor
  editor.update(() => {
    const payloads: FilePayload[] = paths.map((filePath) => ({
      src: `/${filePath}`,
      alt: filePath.split('/').at(-1) ?? 'Untitled',
    }));
    if (editorSelection) {
      $setSelection(editorSelection.clone());
      editor.dispatchCommand(INSERT_FILES_COMMAND, payloads);
    }
  });
}

function BlockTypeDropdownItemLabel({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <span className="flex items-center gap-1.5 will-change-transform">
      {icon} <span className="">{text}</span>
    </span>
  );
}

/** Used in dropdown for block types */
export const blockTypesDropdownItems: DropdownItem[] = [
  ...headingOptions.map(({ tag, Icon }) => ({
    label: (
      <BlockTypeDropdownItemLabel
        icon={<Icon height="1.125rem" width="1.125rem" />}
        text={`Header ${tag.slice(1)}`}
      />
    ),
    value: tag,
  })),
  {
    label: (
      <BlockTypeDropdownItemLabel
        icon={<Text height="0.875rem" width="0.875rem" />}
        text="Paragraph"
      />
    ),
    value: 'paragraph',
  },
  {
    label: (
      <BlockTypeDropdownItemLabel
        icon={<QuoteIcon height="1.125rem" width="1.125rem" />}
        text="Quote"
      />
    ),
    value: 'quote',
  },
  {
    label: (
      <BlockTypeDropdownItemLabel
        icon={<UnorderedList height="1.125rem" width="1.125rem" />}
        text="Unordered List"
      />
    ),
    value: 'ul',
  },
  {
    label: (
      <BlockTypeDropdownItemLabel
        icon={<OrderedList height="1.125rem" width="1.125rem" />}
        text="Ordered List"
      />
    ),
    value: 'ol',
  },
  {
    label: (
      <BlockTypeDropdownItemLabel
        icon={<ListCheckbox height="1.125rem" width="1.125rem" />}
        text="Checkbox List"
      />
    ),
    value: 'check',
  },
  {
    label: (
      <BlockTypeDropdownItemLabel
        icon={<Paperclip height="1.125rem" width="1.125rem" />}
        text="Attachment"
      />
    ),
    value: 'attachment',
  },
  {
    label: (
      <BlockTypeDropdownItemLabel
        icon={<Table height="1.125rem" width="1.125rem" />}
        text="Table"
      />
    ),
    value: 'table',
  },
];

export const listCommandData = [
  {
    block: 'ul',
    icon: (
      <UnorderedList
        height="1.125rem"
        width="1.125rem"
        className="will-change-transform"
      />
    ),
    command: INSERT_UNORDERED_LIST_COMMAND,
    title: 'Unordered List',
    keywords: ['bullet', 'unordered', 'ul', 'list'],
    customDisabled: undefined,
  },
  {
    block: 'ol',
    icon: (
      <OrderedList
        height="1.125rem"
        width="1.125rem"
        className="will-change-transform"
      />
    ),
    command: INSERT_ORDERED_LIST_COMMAND,
    title: 'Ordered List',
    keywords: ['numbered', 'ordered', 'ol', 'list'],
    customDisabled: undefined,
  },
  {
    block: 'check',
    icon: (
      <ListCheckbox
        height="1.125rem"
        width="1.125rem"
        className="will-change-transform"
      />
    ),
    command: INSERT_CHECK_LIST_COMMAND,
    title: 'Check List',
    keywords: ['check', 'checkbox', 'todo', 'task', 'list'],
    customDisabled: undefined,
  },
];

export const attachmentCommandData = {
  block: 'attachment',
  icon: <Paperclip height="1.125rem" width="1.125rem" />,
  command: INSERT_FILES_COMMAND,
};
