import {
  $getNodeByKey,
  $getSelection,
  $isTextNode,
  $setSelection,
  BaseSelection,
  LexicalEditor,
} from 'lexical';
import {
  Dispatch,
  type RefObject,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'wouter';
import { MatchData, clearHighlight, highlightMatch } from '../utils/highlight';
import {
  performSearch,
  navigateToNextMatch,
  navigateToPreviousMatch,
} from '../utils/find';
import { currentFilePathAtom } from '../../../../../atoms';
import { useAtomValue } from 'jotai/react';
import { navigate } from 'wouter/use-browser-location';

function areMatchesEqual(
  matches1: MatchData[],
  matches2: MatchData[]
): boolean {
  if (matches1.length !== matches2.length) return false;
  return matches1.every(
    (match, index) =>
      match.nodeKey === matches2[index].nodeKey &&
      match.start === matches2[index].start &&
      match.end === matches2[index].end &&
      match.format === matches2[index].format
  );
}

/**
 * Manages search state and functionality for the find panel.
 */
export function useFindPanelSearch({
  editor,
  isSearchOpen,
  setIsSearchOpen,
  hasFirstLoad,
  inputRef,
}: {
  editor: LexicalEditor;
  isSearchOpen: boolean;
  setIsSearchOpen: Dispatch<SetStateAction<boolean>>;
  hasFirstLoad: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [matchData, setMatchData] = useState<MatchData[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const highlightedNodeKeyRef = useRef<string | null>(null);
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState('');
  const highlightParamValue = searchParams.get('highlight');
  const currentFilePath = useAtomValue(currentFilePathAtom);

  /**
   * Performs a search for the given term in the editor, updates the match data,
   * highlights the first match if any, and sets the current match index.
   *
   * @param {string} searchTerm - The term to search for in the editor content.
   */
  const handleSearch = (searchTerm: string) => {
    clearHighlight(editor, highlightedNodeKeyRef);

    const matches = performSearch(editor, searchTerm);
    setMatchData(matches);

    // Use the same currentMatchIndex if the matches are the same.
    // Ex: searching for "apple", closing find panel and then opening it again.
    if (areMatchesEqual(matches, matchData)) {
      // Ensure currentMatchIndex is within bounds before using it
      if (currentMatchIndex >= 0 && currentMatchIndex < matches.length) {
        const highlightedNodeKey = highlightMatch(
          editor,
          matches[currentMatchIndex]
        );
        highlightedNodeKeyRef.current = highlightedNodeKey;
        return;
      } else if (matches.length > 0) {
        // Reset to first match if currentMatchIndex is out of bounds
        setCurrentMatchIndex(0);
        const highlightedNodeKey = highlightMatch(editor, matches[0]);
        highlightedNodeKeyRef.current = highlightedNodeKey;
        return;
      }
    }

    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      const highlightedNodeKey = highlightMatch(editor, matches[0]);
      highlightedNodeKeyRef.current = highlightedNodeKey;
    } else {
      setCurrentMatchIndex(-1);
    }
  };

  // Setting default search value if highlight param is present
  useEffect(() => {
    if (highlightParamValue && currentFilePath) {
      // Remove the highlight param from the URL as we don't need it anymore
      navigate(currentFilePath.getLinkToNote(), { replace: true });

      // Ensure the search input reflects the highlight query parameter
      queueMicrotask(() => {
        setSearchValue(highlightParamValue);
        setIsSearchOpen(true);
      });
    }
  }, [highlightParamValue, currentFilePath]);

  // Making sure search is performed when search value is changed and the note has loaded
  useEffect(() => {
    // When the highlight param is used to set input value, we want the input to be focused
    if (inputRef.current !== document.activeElement) {
      inputRef.current?.focus();
    }
    if (searchValue !== null && hasFirstLoad) {
      // Re-run the search whenever the input value changes with a loaded note
      queueMicrotask(() => {
        handleSearch(searchValue);
      });
    }
  }, [searchValue, isSearchOpen, hasFirstLoad]);

  // Store the previous selection to restore it when the find panel is closed with no matches
  const previousSelectionRef = useRef<BaseSelection | null>(null);

  // Clear highlights if the find panel is closed.
  useEffect(() => {
    if (!isSearchOpen) {
      clearHighlight(editor, highlightedNodeKeyRef);

      // Select the highlighted portion if there was an active match
      if (currentMatchIndex >= 0 && currentMatchIndex < matchData.length) {
        const match = matchData[currentMatchIndex];

        const timeoutId = setTimeout(() => {
          editor.update(() => {
            const node = $getNodeByKey(match.nodeKey);
            if (node && $isTextNode(node)) {
              node.select(match.start, match.end + 1);
            }
          });
        }, 200);

        return () => clearTimeout(timeoutId);
      } else {
        // Restore previous selection if no match was found
        const timeoutId = setTimeout(() => {
          if (previousSelectionRef.current) {
            editor.update(() => {
              $setSelection(previousSelectionRef.current);
            });
          }
        }, 200);

        return () => clearTimeout(timeoutId);
      }
    } else {
      editor.read(() => {
        const selection = $getSelection();
        previousSelectionRef.current = selection?.clone() ?? null;
      });
    }
  }, [isSearchOpen, setIsSearchOpen]);

  return {
    matchData,
    searchValue,
    setSearchValue,
    currentMatchIndex,
    setCurrentMatchIndex,
    highlightedNodeKeyRef,
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
    navigateToNextMatch: () =>
      navigateToNextMatch({
        editor,
        matchData,
        currentMatchIndex,
        setCurrentMatchIndex,
        highlightedNodeKeyRef,
      }),
    navigateToPreviousMatch: () =>
      navigateToPreviousMatch({
        editor,
        matchData,
        currentMatchIndex,
        setCurrentMatchIndex,
        highlightedNodeKeyRef,
      }),
  };
}
