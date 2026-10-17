import type { TextMatchTransformer } from '@lexical/markdown';
import {
  $isTextNode,
  type LexicalNode,
  type TextFormatType,
  type TextNode,
} from 'lexical';

const CODE_SPAN_FORMATS: TextFormatType[] = [
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'subscript',
  'superscript',
  'lowercase',
  'uppercase',
  'capitalize',
];

function isSameCodeSpan(
  node: LexicalNode | null,
  reference: TextNode
): node is TextNode {
  return (
    $isTextNode(node) &&
    node.hasFormat('code') &&
    CODE_SPAN_FORMATS.every(
      (format) => node.hasFormat(format) === reference.hasFormat(format)
    )
  );
}

// Find highlights split text nodes without changing the underlying code span.
// Export that span once so adjacent fences cannot become literal backticks on import.
export const INLINE_CODE_EXPORT: TextMatchTransformer = {
  dependencies: [],
  type: 'text-match',
  regExp: /$^/,
  export: (node, _exportChildren, exportFormat) => {
    if (!$isTextNode(node) || !node.hasFormat('code')) return null;

    // Emit at the last piece so exportFormat closes any surrounding formatting
    // according to the sibling after the complete span.
    if (isSameCodeSpan(node.getNextSibling(), node)) return '';

    const parts = [node.getTextContent()];
    let previous = node.getPreviousSibling();
    while (isSameCodeSpan(previous, node)) {
      parts.push(previous.getTextContent());
      previous = previous.getPreviousSibling();
    }
    return exportFormat(node, parts.reverse().join(''));
  },
};
