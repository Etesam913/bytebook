import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { easingFunctions } from '../../../../animations';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { XMark } from '../../../../icons/circle-xmark';
import { Magnifier } from '../../../../icons/magnifier';
import { NavigationControls } from './navigation-controls';
import { Input } from '../../../input';

export function NoteSearch({
  isSearchOpen,
  setIsSearchOpen,
}: {
  isSearchOpen: boolean;
  setIsSearchOpen: (isSearchOpen: boolean) => void;
}) {
  const [searchValue, setSearchValue] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(1);
  const [totalMatches, setTotalMatches] = useState(0);
  const [editor] = useLexicalComposerContext();

  const handlePreviousMatch = () => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
    }
  };

  const handleNextMatch = () => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
    }
  };

  const handleClose = () => {
    setIsSearchOpen(false);
    editor.focus();
  };

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          className="absolute top-16 right-6 z-50"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{
            ease: easingFunctions['ease-out-circ'],
          }}
        >
          <div className="flex items-center shadow-md bg-zinc-100 dark:bg-zinc-700 py-0.5 px-2 rounded-md border-2 border-zinc-300 dark:border-zinc-600 focus-within:border-(--accent-color) w-full gap-1.5">
            <Magnifier
              width={12}
              height={12}
              className="text-zinc-500 dark:text-zinc-400"
            />

            <Input
              labelProps={{}}
              inputProps={{
                value: searchValue,
                onChange: (e) => setSearchValue(e.target.value),
                placeholder: 'Search in note...',
                className:
                  'text-sm w-48 dark:text-zinc-100 bg-transparent outline-none border-none px-0.5',
                autoFocus: true,
                autoCapitalize: 'off',
                autoComplete: 'off',
                autoCorrect: 'off',
                spellCheck: false,
                type: 'text',
                onFocus: (e) => e.target.select(),
                onKeyDown: (e) => {
                  if (e.key === 'Escape') {
                    handleClose();
                  } else if (e.key === 'Enter') {
                    if (e.shiftKey) {
                      handlePreviousMatch();
                    } else {
                      handleNextMatch();
                    }
                  }
                },
              }}
            />

            <NavigationControls
              searchValue={searchValue}
              totalMatches={totalMatches}
              currentMatchIndex={currentMatchIndex}
              onPreviousMatch={handlePreviousMatch}
              onNextMatch={handleNextMatch}
            />

            <button
              onClick={() => {
                setIsSearchOpen(false);
                editor.focus();
              }}
              title="Close (Escape)"
              className="rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 "
              tabIndex={0}
              aria-label="Close search"
            >
              <XMark
                width={14}
                height={14}
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
