import {
  $getNodeByKey,
  $getSelection,
  $isTextNode,
  $setSelection,
  BaseSelection,
  LexicalEditor,
} from 'lexical';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { MatchData, clearHighlight, highlightMatch } from '../utils/highlight';
import {
  performSearch,
  navigateToNextMatch,
  navigateToPreviousMatch,
} from '../utils/find';

/**
 * Manages search state and functionality for the find panel.
 */
export function useFindPanelSearch({
  editor,
  isSearchOpen,
}: {
  editor: LexicalEditor;
  isSearchOpen: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [matchData, setMatchData] = useState<MatchData[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const highlightedNodeKeyRef = useRef<string | null>(null);
  const previousSelectionRef = useRef<BaseSelection | null>(null);

  // Searches the editor for the term and highlights the first match, if any
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    clearHighlight(editor, highlightedNodeKeyRef);
    const matches = performSearch(editor, term);
    setMatchData(matches);
    setCurrentMatchIndex(matches.length === 0 ? -1 : 0);
    if (matches.length > 0) {
      highlightedNodeKeyRef.current = highlightMatch(editor, matches[0]);
    }
  };

  // Remember the editor selection so it can be restored once the panel closes
  useEffect(() => {
    if (!isSearchOpen) return;
    editor.read(() => {
      previousSelectionRef.current = $getSelection()?.clone() ?? null;
    });
  }, [isSearchOpen, editor]);

  // Runs after the exit animation so the selection change is not visible mid-fade
  const handleExitComplete = () => {
    clearHighlight(editor, highlightedNodeKeyRef);
    editor.update(() => {
      const match = matchData[currentMatchIndex];
      const node = match ? $getNodeByKey(match.nodeKey) : null;
      if (node && $isTextNode(node)) {
        node.select(match.start, match.end + 1);
      } else if (previousSelectionRef.current) {
        $setSelection(previousSelectionRef.current);
      }
    });
  };

  return {
    searchTerm,
    handleSearch,
    matchData,
    currentMatchIndex,
    setCurrentMatchIndex,
    highlightedNodeKeyRef,
    handleExitComplete,
  };
}

/**
 * Manages navigation between search matches.
 */
export function useMatchNavigation({
  editor,
  matchData,
  currentMatchIndex,
  setCurrentMatchIndex,
  highlightedNodeKeyRef,
}: {
  editor: LexicalEditor;
  matchData: MatchData[];
  currentMatchIndex: number;
  setCurrentMatchIndex: (index: number) => void;
  highlightedNodeKeyRef: RefObject<string | null>;
}) {
  return {
    navigateToNextMatch: () => {
      return navigateToNextMatch({
        editor,
        matchData,
        currentMatchIndex,
        setCurrentMatchIndex,
        highlightedNodeKeyRef,
      });
    },
    navigateToPreviousMatch: () => {
      return navigateToPreviousMatch({
        editor,
        matchData,
        currentMatchIndex,
        setCurrentMatchIndex,
        highlightedNodeKeyRef,
      });
    },
  };
}
