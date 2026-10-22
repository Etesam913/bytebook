import { ListItemNode, ListNode } from '@lexical/list';
import type { InitialConfigType } from '@lexical/react/LexicalComposer';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { type EditorThemeClasses, LineBreakNode, ParagraphNode } from 'lexical';
import { CodeNode } from './nodes/code';
import { FileNode } from './nodes/file';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { BytebookLinkNode, linkNodeReplacement } from './nodes/link';

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error: Error) {
  console.error(error);
}

const theme: EditorThemeClasses = {
  internalLink: 'link-internal',
  link: 'link',
  quote: 'editor-quote',
  table: 'PlaygroundEditorTheme__table',
  tableCell: 'PlaygroundEditorTheme__tableCell',
  tableCellHeader: 'PlaygroundEditorTheme__tableCellHeader',
  tableCellSelected: 'PlaygroundEditorTheme__tableCellSelected',
  tableScrollableWrapper: 'PlaygroundEditorTheme__tableScrollableWrapper',
  tableSelection: 'PlaygroundEditorTheme__tableSelection',
  list: {
    ulDepth: ['root-ul', 'ul-1'],
    olDepth: ['root-ol', 'ol-1'],
    listitem: 'root-li',
    nested: {
      listitem: 'nested-li',
    },
    checklist: 'check-list',
    listitemChecked: 'PlaygroundEditorTheme__listItemChecked',
    listitemUnchecked: 'PlaygroundEditorTheme__listItemUnchecked',
  },
  text: {
    // Inline code renders as <code> rather than <mark>, even when highlighted.
    highlight: 'text-highlight',
    bold: 'text-bold',
    italic: 'text-italic',
    underline: 'text-underline',
    strikethrough: 'text-strikethrough',
  },
};

export const editorConfig: InitialConfigType = {
  namespace: 'note-editor',
  theme: theme,
  // editable: false,
  onError,
  nodes: [
    HeadingNode,
    QuoteNode,
    HorizontalRuleNode,
    LineBreakNode,
    LinkNode,
    ListNode,
    ListItemNode,
    ParagraphNode,
    FileNode,
    TableNode,
    TableCellNode,
    TableRowNode,
    CodeNode,
    AutoLinkNode,
    BytebookLinkNode,
    linkNodeReplacement,
  ],
};
