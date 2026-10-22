import { Dispatch, SetStateAction, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { easingFunctions } from '@/animations';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { XMark } from '@/icons/circle-xmark';
import { Magnifier } from '@/icons/magnifier';
import { NavigationControls } from './navigation-controls';
import { AppIconButton } from '@components/buttons';
import { AppTextField } from '@components/input';
import { Tooltip } from '@components/tooltip';
import { useInteractOutside } from 'react-aria';
import { useFindPanelSearch } from './hooks/find-panel';
import { clearAllHighlights } from './utils/highlight';

export function NoteFindPanel({
  isSearchOpen,
  setIsSearchOpen,
}: {
  isSearchOpen: boolean;
  setIsSearchOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [editor] = useLexicalComposerContext();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize search functionality
  const {
    searchTerm,
    handleSearch,
    matchData,
    currentMatchIndex,
    handleExitComplete,
    navigateToNextMatch,
    navigateToPreviousMatch,
  } = useFindPanelSearch({ editor, isSearchOpen });

  // Clear highlights when clicking outside
  useInteractOutside({
    ref: panelRef,
    onInteractOutside: () => {
      clearAllHighlights(editor);
    },
  });

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isSearchOpen && (
        <motion.div
          ref={panelRef}
          className="absolute top-16 right-6 z-50 w-96 flex items-center shadow-md bg-zinc-100 dark:bg-zinc-700 py-0.5 px-2 rounded-md border-2 border-zinc-300 dark:border-zinc-600 focus-within:border-(--accent-color)! gap-2"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ ease: easingFunctions['ease-out-circ'] }}
        >
          <Magnifier
            width="1rem"
            height="1rem"
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          />

          <AppTextField
            ref={inputRef}
            className="flex-1"
            placeholder="Search in note..."
            value={searchTerm}
            inputClassName="text-sm dark:text-zinc-100 bg-transparent outline-none rounded-sm border-none px-0.5 !border-0"
            autoFocus
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={handleSearch}
            id="note-find-input"
            inputAttrs={{
              onFocus: (e) => e.target.select(),
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setIsSearchOpen(false);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                  navigateToPreviousMatch();
                } else {
                  navigateToNextMatch();
                }
              }
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

          <Tooltip content="Close" shortcut="Escape" delay={{ open: 50 }}>
            <AppIconButton
              onPress={() => setIsSearchOpen(false)}
              className="p-0.5 rounded text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-600"
              aria-label="Close search"
            >
              <XMark width="1.125rem" height="1.125rem" fill="currentColor" />
            </AppIconButton>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
