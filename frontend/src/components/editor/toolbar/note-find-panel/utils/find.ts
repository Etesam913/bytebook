import { $dfs } from '@lexical/utils';
import {
  $getRoot,
  $isElementNode,
  $isTextNode,
  LexicalEditor,
  TextNode,
} from 'lexical';
import { MatchData, clearHighlight, highlightMatch } from './highlight';
import { type RefObject } from 'react';

/**
 * Performs a case-insensitive search for the given term in the editor content.
 * @param editor - The Lexical editor instance
 * @param searchTerm - The text to search for in the editor
 * @returns Array of match data for all found matches
 */
export function performSearch(
  editor: LexicalEditor,
  searchTerm: string
): MatchData[] {
  const matches: MatchData[] = [];

  if (!searchTerm.trim()) {
    return matches;
  }
  const normalizedSearchTerm = searchTerm.toLowerCase().trim();

  editor.read(() => {
    let textNodes: TextNode[] = [];

    const searchTextRun = () => {
      let offset = 0;
      const spans = textNodes.map((node) => {
        const text = node.getTextContent().toLowerCase();
        const span = { node, text, offset };
        offset += text.length;
        return span;
      });
      const text = spans.map((span) => span.text).join('');
      let startIndex = text.indexOf(normalizedSearchTerm);

      while (startIndex !== -1) {
        const endIndex = startIndex + normalizedSearchTerm.length - 1;
        const first = spans.find(
          (span) => startIndex < span.offset + span.text.length
        )!;
        const last = spans.find(
          (span) => endIndex < span.offset + span.text.length
        )!;
        matches.push({
          start: startIndex - first.offset,
          end: endIndex - last.offset,
          nodeKey: first.node.getKey(),
          endNodeKey: last.node.getKey(),
          format: first.node.getFormat(),
        });
        startIndex = text.indexOf(normalizedSearchTerm, startIndex + 1);
      }
      textNodes = [];
    };

    // Inline formatting and links share a text run; blocks and non-text leaves
    // (such as line breaks or code editors) interrupt it.
    for (const { node } of $dfs($getRoot())) {
      if ($isTextNode(node)) {
        textNodes.push(node);
      } else if (!$isElementNode(node) || !node.isInline()) {
        searchTextRun();
      }
    }
    searchTextRun();
  });

  return matches;
}

/**
 * Moves the highlight to the adjacent match, wrapping around at either end.
 */
export function navigateToMatch({
  editor,
  matchData,
  currentMatchIndex,
  setCurrentMatchIndex,
  highlightedNodeKeyRef,
  direction,
}: {
  editor: LexicalEditor;
  matchData: MatchData[];
  currentMatchIndex: number;
  setCurrentMatchIndex: (index: number) => void;
  highlightedNodeKeyRef: RefObject<string | null>;
  direction: 'next' | 'previous';
}): void {
  const total = matchData.length;
  if (total === 0) return;

  const nextIndex =
    direction === 'next'
      ? (currentMatchIndex + 1) % total
      : currentMatchIndex <= 0
        ? total - 1
        : currentMatchIndex - 1;

  clearHighlight(editor, highlightedNodeKeyRef);
  setCurrentMatchIndex(nextIndex);
  highlightedNodeKeyRef.current = highlightMatch(editor, matchData[nextIndex]);
}
