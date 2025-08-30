import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { easingFunctions } from '../../../../animations';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isTextNode,
  ElementNode,
  LexicalEditor,
  TextNode,
} from 'lexical';

import { $dfs } from '@lexical/utils';
import { XMark } from '../../../../icons/circle-xmark';
import { Magnifier } from '../../../../icons/magnifier';
import { NavigationControls } from './navigation-controls';
import { Input } from '../../../input';
import { runEditorMutationWithoutStealingFocus } from '../../../../utils/selection';
import { useOnClickOutside } from '../../../../hooks/general';

function clearHighlights(editor: LexicalEditor) {
  runEditorMutationWithoutStealingFocus(editor, () => {
    const dfsNodes = $dfs($getRoot());
    const highlightedNodes: Array<{
      node: TextNode;
      parent: ElementNode;
      index: number;
    }> = [];

    // Find all highlighted nodes and their positions
    dfsNodes.forEach(({ node }) => {
      if ($isTextNode(node) && node.hasFormat('highlight')) {
        const parent = node.getParent();
        if (parent && $isElementNode(parent)) {
          const index = parent.getChildren().indexOf(node);
          highlightedNodes.push({ node, parent, index });
        }
      }
    });

    // Remove highlights and merge text nodes
    highlightedNodes.forEach(({ node, parent, index }) => {
      node.toggleFormat('highlight');

      const canMergeWith = (sibling: any): sibling is TextNode =>
        sibling &&
        $isTextNode(sibling) &&
        sibling.getFormat() === node.getFormat() &&
        sibling.getStyle() === node.getStyle();

      const prevSibling = parent.getChildAtIndex(index - 1);
      if (canMergeWith(prevSibling)) {
        // Merge with previous sibling
        const mergedText = prevSibling.getTextContent() + node.getTextContent();
        prevSibling.setTextContent(mergedText);
        node.remove();

        // Check if we can also merge with next sibling
        const nextSibling = parent.getChildAtIndex(index);
        if (canMergeWith(nextSibling)) {
          const finalText =
            prevSibling.getTextContent() + nextSibling.getTextContent();
          prevSibling.setTextContent(finalText);
          nextSibling.remove();
        }
      } else {
        // Check if we can merge with next sibling only
        const nextSibling = parent.getChildAtIndex(index + 1);
        if (canMergeWith(nextSibling)) {
          const mergedText =
            node.getTextContent() + nextSibling.getTextContent();
          node.setTextContent(mergedText);
          nextSibling.remove();
        }
      }
    });
  });
}

type MatchData = {
  start: number;
  end: number;
  nodeKey: string;
  format: number;
};

export function NoteFindPanel({
  isSearchOpen,
  setIsSearchOpen,
}: {
  isSearchOpen: boolean;
  setIsSearchOpen: (isSearchOpen: boolean) => void;
}) {
  const [searchValue, setSearchValue] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [totalMatches, setTotalMatches] = useState(0);
  const [allMatches, setAllMatches] = useState<MatchData[]>([]);
  const [editor] = useLexicalComposerContext();
  const panelRef = useRef<HTMLDivElement>(null);

  // Clear highlights when clicking outside the search panel
  useOnClickOutside(panelRef, () => {
    clearHighlights(editor);
  });

  function performSearch(searchTerm: string) {
    if (!searchTerm) {
      clearHighlights(editor);
      setAllMatches([]);
      setTotalMatches(0);
      setCurrentMatchIndex(-1);
      return;
    }

    const matches: MatchData[] = [];
    clearHighlights(editor);

    runEditorMutationWithoutStealingFocus(editor, () => {
      $dfs($getRoot()).forEach(({ node }) => {
        if (!$isTextNode(node)) return;

        const nodeText = node.getTextContent();
        let searchIndex = 0;

        for (let i = 0; i < nodeText.length; i++) {
          if (nodeText[i] === searchTerm[searchIndex]) {
            searchIndex++;
            if (searchIndex === searchTerm.length) {
              matches.push({
                start: i - searchTerm.length + 1,
                end: i,
                nodeKey: node.getKey(),
                format: node.getFormat(),
              });
              searchIndex = 0;
            }
          } else {
            searchIndex = 0;
          }
        }
      });
    });

    // Update state and highlight first match
    setAllMatches(matches);
    setTotalMatches(matches.length);

    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      highlightMatch(0, matches);
    } else {
      setCurrentMatchIndex(-1);
    }
  }

  function scrollToMatch(targetNode: TextNode) {
    setTimeout(() => {
      editor.read(() => {
        if (targetNode) {
          const editorElement = editor.getElementByKey(targetNode.getKey());
          if (editorElement) {
            editorElement.scrollIntoView({
              block: 'center',
              inline: 'nearest',
            });
          }
        }
      });
    }, 50);
  }

  function highlightMatch(
    matchIndex: number,
    matches: MatchData[] = allMatches
  ) {
    if (matchIndex < 0 || matchIndex >= matches.length) return;
    let targetNode: TextNode | null = null;

    const match = matches[matchIndex];
    runEditorMutationWithoutStealingFocus(editor, () => {
      const node = $getNodeByKey(match.nodeKey);
      if (!node || !$isTextNode(node)) return;

      const newNodes =
        match.start === 0
          ? node.splitText(match.end + 1)
          : node.splitText(match.start, match.end + 1);

      targetNode = match.start === 0 ? newNodes[0] : newNodes[1];
      targetNode.setFormat('highlight');
    });

    if (targetNode) {
      scrollToMatch(targetNode);
    }
  }

  function navigateToNextMatch() {
    if (totalMatches === 0) return;

    clearHighlights(editor);
    const nextIndex = (currentMatchIndex + 1) % totalMatches;
    setCurrentMatchIndex(nextIndex);
    highlightMatch(nextIndex);
  }

  function navigateToPreviousMatch() {
    if (totalMatches === 0) return;

    clearHighlights(editor);
    const prevIndex =
      currentMatchIndex <= 0 ? totalMatches - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    highlightMatch(prevIndex);
  }

  function handleClose() {
    // Clear any existing highlights before closing
    clearHighlights(editor);
    setIsSearchOpen(false);
    editor.focus();
  }

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          ref={panelRef}
          className="absolute top-16 right-6 z-50"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ ease: easingFunctions['ease-out-circ'] }}
        >
          <div className="flex items-center shadow-md bg-zinc-100 dark:bg-zinc-700 py-0.5 px-2 rounded-md border-2 border-zinc-300 dark:border-zinc-600 focus-within:border-(--accent-color) w-full gap-1.5">
            <Magnifier
              width={16}
              height={16}
              className="text-zinc-500 dark:text-zinc-400"
            />

            <Input
              labelProps={{}}
              inputProps={{
                placeholder: 'Search in note...',
                value: searchValue,
                className:
                  'text-sm w-48 dark:text-zinc-100 bg-transparent outline-none border-none px-0.5',
                autoFocus: true,
                autoCapitalize: 'off',
                autoComplete: 'off',
                autoCorrect: 'off',
                spellCheck: false,
                onFocus: () => {
                  // performSearch(searchValue);
                },
                onChange: (e) => {
                  const searchTerm = e.target.value;
                  setSearchValue(searchTerm);
                  performSearch(searchTerm);
                },
                onKeyDown: (e) => {
                  if (e.key === 'Escape') {
                    handleClose();
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    e.shiftKey
                      ? navigateToPreviousMatch()
                      : navigateToNextMatch();
                  }
                },
              }}
            />

            <NavigationControls
              searchValue={searchValue}
              totalMatches={totalMatches}
              currentMatchIndex={
                currentMatchIndex >= 0 ? currentMatchIndex + 1 : 0
              }
              onPreviousMatch={navigateToPreviousMatch}
              onNextMatch={navigateToNextMatch}
            />

            <button
              onClick={handleClose}
              title="Close (Escape)"
              className="rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 "
              tabIndex={0}
              aria-label="Close search"
            >
              <XMark
                width={18}
                height={18}
                fill="currentColor"
                title="Close search"
              />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
