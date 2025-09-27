import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AnimatePresence, motion } from 'motion/react';
import { useSetAtom } from 'jotai';
import { $getRoot } from 'lexical';
import { useEffect, useState } from 'react';
import { isToolbarDisabledAtom } from '../../atoms';
import { NAME_CHARS, cn, FilePath } from '../../utils/string-formatting';
import { useRenameFileMutation } from '../../hooks/notes';
import { navigate } from 'wouter/use-browser-location';

export function NoteTitle({ note, folder }: { note: string; folder: string }) {
  const [editor] = useLexicalComposerContext();
  const [noteTitle, setNoteTitle] = useState(note);
  const [errorText, setErrorText] = useState('');
  const setIsToolbarDisabled = useSetAtom(isToolbarDisabledAtom);
  const { mutateAsync: renameFile } = useRenameFileMutation();

  useEffect(() => {
    setNoteTitle(decodeURIComponent(note));
    setErrorText('');
  }, [note]);

  return (
    <div className="mt-2 mb-3 flex flex-col">
      <input
        className={cn(
          'bg-transparent text-3xl mb-1 transition-colors duration-300 outline-hidden font-semibold w-full',
          errorText.length > 0 && 'text-red-600 dark:text-red-500'
        )}
        onClick={(e) => e.stopPropagation()}
        value={noteTitle}
        title={errorText}
        onChange={(e) => {
          const name = e.target.value.trim();
          setNoteTitle(e.target.value);
          if (!NAME_CHARS.test(name)) {
            setErrorText(
              'Note titles can only contain letters, numbers, spaces, hyphens, and underscores.'
            );
          } else {
            setErrorText('');
          }
        }}
        placeholder="Untitled Note"
        onFocus={() => setIsToolbarDisabled(true)}
        onBlur={async () => {
          setIsToolbarDisabled(false);
          if (noteTitle === note || errorText.length > 0) return;

          const oldFilePath = new FilePath({
            folder: decodeURIComponent(folder),
            note: `${decodeURIComponent(note)}.md`,
          });

          const newFilePath = new FilePath({
            folder: decodeURIComponent(folder),
            note: `${noteTitle}.md`,
          });

          try {
            await renameFile({
              oldPath: oldFilePath,
              newPath: newFilePath,
              setErrorText,
            });
            navigate(newFilePath.getLinkToNote());
          } catch (error) {
            // Error handling is done in the mutation
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // Selects first child of the editor
            editor.update(() => {
              const firstChild = $getRoot().getFirstChild();
              if (firstChild) {
                e.preventDefault();
                firstChild.selectEnd();
              }
            });
          }
        }}
        pattern={NAME_CHARS.source}
        maxLength={50}
        required
      />
      <AnimatePresence>
        {errorText.length > 0 && (
          <motion.p
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{
              height: 0,
              opacity: 0,
              transition: { opacity: { duration: 0.2 } },
            }}
            transition={{ type: 'spring', damping: 12, stiffness: 130 }}
            className="text-red-600 overflow-auto dark:text-red-500 text-xs pointer-events-none select-none"
          >
            {errorText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
