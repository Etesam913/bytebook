import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { easingFunctions } from '../../../../animations';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { XMark } from '../../../../icons/circle-xmark';
import { Magnifier } from '../../../../icons/magnifier';
import { NavigationControls } from './navigation-controls';
import { Input } from '../../../input';
import { useOnClickOutside } from '../../../../hooks/general';
import {
  usePanelClose,
  useSearch,
  useMatchNavigation,
  useHighlightParam,
} from './hooks/find-panel';
import { clearHighlight } from './utils/highlight';

// Re-export MatchData for backwards compatibility
export type { MatchData } from './utils/highlight';

export function NoteFindPanel({
  isSearchOpen,
  setIsSearchOpen,
}: {
  isSearchOpen: boolean;
  setIsSearchOpen: (isSearchOpen: boolean) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const panelRef = useRef<HTMLDivElement>(null);

  // Clear highlights when clicking outside
  useOnClickOutside(panelRef, () => {
    clearHighlight(editor, highlightedNodeKeyRef);
  });

  // Initialize search functionality
  const {
    searchValue,
    setSearchValue,
    matchData,
    currentMatchIndex,
    setCurrentMatchIndex,
    highlightedNodeKeyRef,
    handleSearch,
  } = useSearch(editor);

  // Initialize navigation functionality
  const { navigateToNextMatch, navigateToPreviousMatch } = useMatchNavigation(
    editor,
    matchData,
    currentMatchIndex,
    setCurrentMatchIndex,
    highlightedNodeKeyRef
  );

  // Handle panel close behavior
  usePanelClose(
    isSearchOpen,
    editor,
    highlightedNodeKeyRef,
    currentMatchIndex,
    matchData
  );

  // Handle URL highlight parameter
  useHighlightParam(setIsSearchOpen, setSearchValue, handleSearch);

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          ref={panelRef}
          className="absolute top-16 right-6 z-50 w-96 flex items-center shadow-md bg-zinc-100 dark:bg-zinc-700 py-0.5 px-2 rounded-md border-2 border-zinc-300 dark:border-zinc-600 focus-within:!border-(--accent-color) gap-2"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ ease: easingFunctions['ease-out-circ'] }}
        >
          <Magnifier
            width={16}
            height={16}
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          />

          <Input
            labelProps={{}}
            inputProps={{
              placeholder: 'Search in note...',
              value: searchValue,
              className:
                'text-sm flex-1 dark:text-zinc-100 bg-transparent outline-none border-none px-0.5 !outline-none !border-0 font-code',
              autoFocus: true,
              autoCapitalize: 'off',
              autoComplete: 'off',
              autoCorrect: 'off',
              spellCheck: false,
              onFocus: (e) => {
                e.target.select();
              },
              onChange: (e) => {
                const searchTerm = e.target.value;
                setSearchValue(searchTerm);
                handleSearch(searchTerm);
              },
              onKeyDown: (e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSearchOpen(false);
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
            totalMatches={matchData.length}
            currentMatchIndex={
              currentMatchIndex >= 0 ? currentMatchIndex + 1 : 0
            }
            onPreviousMatch={navigateToPreviousMatch}
            onNextMatch={navigateToNextMatch}
          />

          <button
            onClick={() => setIsSearchOpen(false)}
            title="Close (Escape)"
            className="rounded text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-600 "
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
