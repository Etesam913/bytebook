import { $getNodeByKey, $isTextNode, LexicalEditor } from 'lexical';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'wouter';
import { MatchData, clearHighlight, highlightMatch } from '../utils/highlight';
import {
  performSearch,
  navigateToNextMatch,
  navigateToPreviousMatch,
} from '../utils/find';

const PANEL_CLOSE_SELECT_DELAY = 50;

/**
 * Handles closing the search panel by clearing highlights and focusing the editor.
 * Optionally selects the text that was previously highlighted for user context.
 */
export function usePanelClose(
  isSearchOpen: boolean,
  editor: LexicalEditor,
  highlightedNodeKeyRef: RefObject<string | null>,
  currentMatchIndex: number,
  matchData: MatchData[]
) {
  useEffect(() => {
    if (!isSearchOpen) {
      // Clear any existing highlights before closing
      clearHighlight(editor, highlightedNodeKeyRef);

      // Select the highlighted portion if there was an active match
      if (currentMatchIndex >= 0 && currentMatchIndex < matchData.length) {
        const match = matchData[currentMatchIndex];

        setTimeout(() => {
          editor.update(() => {
            const node = $getNodeByKey(match.nodeKey);
            if (node && $isTextNode(node)) {
              node.select(match.start, match.end + 1);
            }
          });
        }, PANEL_CLOSE_SELECT_DELAY);
      }
    }
  }, [
    isSearchOpen,
    editor,
    highlightedNodeKeyRef,
    currentMatchIndex,
    matchData,
  ]);
}

/**
 * Manages search state and functionality for the find panel.
 */
export function useSearch(editor: LexicalEditor) {
  const [searchValue, setSearchValue] = useState('');
  const [matchData, setMatchData] = useState<MatchData[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const highlightedNodeKeyRef = useRef<string | null>(null);

  const handleSearch = (searchTerm: string) => {
    // Clear existing highlights
    clearHighlight(editor, highlightedNodeKeyRef);

    const matches = performSearch(editor, searchTerm);
    setMatchData(matches);

    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      const highlightedNodeKey = highlightMatch(editor, matches[0]);
      highlightedNodeKeyRef.current = highlightedNodeKey;
    } else {
      setCurrentMatchIndex(-1);
    }
  };

  return {
    searchValue,
    setSearchValue,
    matchData,
    currentMatchIndex,
    setCurrentMatchIndex,
    highlightedNodeKeyRef,
    handleSearch,
  };
}

/**
 * Manages navigation between search matches.
 */
export function useMatchNavigation(
  editor: LexicalEditor,
  matchData: MatchData[],
  currentMatchIndex: number,
  setCurrentMatchIndex: (index: number) => void,
  highlightedNodeKeyRef: React.MutableRefObject<string | null>
) {
  return {
    navigateToNextMatch: () =>
      navigateToNextMatch(
        editor,
        matchData,
        currentMatchIndex,
        setCurrentMatchIndex,
        highlightedNodeKeyRef
      ),
    navigateToPreviousMatch: () =>
      navigateToPreviousMatch(
        editor,
        matchData,
        currentMatchIndex,
        setCurrentMatchIndex,
        highlightedNodeKeyRef
      ),
  };
}

// There is some time that has to elapse for lexical to have the nodes loaded in
const HIGHLIGHT_QUERY_PARAM_DELAY = 200;

/**
 * Handles URL search parameters for auto-highlighting text.
 */
export function useHighlightParam(
  setIsSearchOpen: (isOpen: boolean) => void,
  setSearchValue: (value: string) => void,
  handleSearch: (searchTerm: string) => void
) {
  const [searchParams] = useSearchParams();
  const highlightParamValue = searchParams.get('highlight');

  useEffect(() => {
    if (highlightParamValue && highlightParamValue.trim().length > 0) {
      setIsSearchOpen(true);
      setSearchValue(highlightParamValue);
      setTimeout(() => {
        handleSearch(highlightParamValue.toLowerCase().trim());
      }, HIGHLIGHT_QUERY_PARAM_DELAY);
    }
  }, [highlightParamValue, setIsSearchOpen, setSearchValue, handleSearch]);
}
