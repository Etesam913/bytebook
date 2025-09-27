import { useSetAtom } from 'jotai/react';
import { getDefaultButtonVariants } from '../animations';
import { dialogDataAtom } from '../atoms';
import { MotionButton } from '../components/buttons';
import { DialogErrorText } from '../components/dialog';
import { Input } from '../components/input';
import { Compose } from '../icons/compose';
import { useNoteCreateMutation } from './notes';
import { useSaveSearchMutation } from './search';
import { BookBookmark } from '../icons/book-bookmark';

/**
 * Custom hook that returns a function to open a "Create Note" dialog for a given folder.
 *
 * When invoked with a folder name, this function opens a dialog allowing the user to enter a new note name.
 * On submission, it validates the note name, attempts to create the note in the specified folder,
 * and navigates to the new note if successful. If an error occurs, it displays an error message in the dialog.
 *
 * @returns {(folder: string) => void} Function to open the create note dialog for the specified folder.
 *
 * Usage:
 *   const openCreateNoteDialog = useCreateNoteDialog();
 *   openCreateNoteDialog('MyFolder');
 */
export function useCreateNoteDialog(): (folder: string) => void {
  const setDialogData = useSetAtom(dialogDataAtom);
  const { mutateAsync: createNote } = useNoteCreateMutation();

  return (folder: string) => {
    setDialogData({
      isOpen: true,
      isPending: false,
      title: 'Create Note',
      children: (errorText) => (
        <>
          <fieldset className="flex flex-col">
            <Input
              label="New Note Name"
              labelProps={{ htmlFor: 'note-name' }}
              inputProps={{
                id: 'note-name',
                name: 'note-name',
                placeholder: "Today's Tasks",
                autoFocus: true,
                autoCapitalize: 'off',
                autoComplete: 'off',
                spellCheck: 'false',
                type: 'text',
              }}
            />
            <DialogErrorText errorText={errorText} />
          </fieldset>
          <MotionButton
            {...getDefaultButtonVariants({
              disabled: false,
              whileHover: 1.05,
              whileTap: 0.95,
              whileFocus: 1.05,
            })}
            className="w-[calc(100%-1.5rem)] mx-auto text-center justify-center"
            type="submit"
          >
            <span>Create Note</span> <Compose />
          </MotionButton>
        </>
      ),
      onSubmit: async (e, setErrorText) =>
        createNote({
          e,
          folder,
          setErrorText,
        }),
    });
  };
}

/**
 * Custom hook that returns a function to open a "Save Search" dialog.
 *
 * When invoked with a search query, this function opens a dialog allowing the user to enter a name for the search.
 * On submission, it saves the search query with the given name.
 *
 * @returns {(searchQuery: string) => void} Function to open the save search dialog for the specified query.
 *
 * Usage:
 *   const openSaveSearchDialog = useSaveSearchDialog();
 *   openSaveSearchDialog('my search query');
 */
export function useSaveSearchDialog(): (searchQuery: string) => void {
  const setDialogData = useSetAtom(dialogDataAtom);
  const { mutateAsync: saveSearch } = useSaveSearchMutation();

  return (searchQuery: string) => {
    setDialogData({
      isOpen: true,
      isPending: false,
      title: 'Save Search',
      children: (errorText) => (
        <>
          <fieldset className="flex flex-col">
            <Input
              label="Search Name"
              labelProps={{ htmlFor: 'search-name' }}
              inputProps={{
                id: 'search-name',
                name: 'search-name',
                placeholder: 'Grocery Lists',
                autoFocus: true,
                autoCapitalize: 'off',
                autoComplete: 'off',
                spellCheck: 'false',
                type: 'text',
              }}
            />
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Query name: <span className="font-mono">{searchQuery}</span>
            </div>
            <DialogErrorText errorText={errorText} />
          </fieldset>
          <MotionButton
            {...getDefaultButtonVariants({
              disabled: false,
              whileHover: 1.05,
              whileTap: 0.95,
              whileFocus: 1.05,
            })}
            className="w-[calc(100%-1.5rem)] mx-auto text-center justify-center"
            type="submit"
          >
            <span>Save Search</span>
            <BookBookmark height={20} width={20} />
          </MotionButton>
        </>
      ),
      onSubmit: async (e, setErrorText) => {
        const formData = new FormData(e.target as HTMLFormElement);
        const name = formData.get('search-name') as string;

        if (!name.trim()) {
          setErrorText('Please enter a name for the search');
          return false;
        }

        try {
          await saveSearch({
            searchQuery,
            name: name.trim(),
          });

          // Dialog will close automatically on successful submission
          return true;
        } catch (error) {
          setErrorText(
            error instanceof Error ? error.message : 'Failed to save search'
          );
          return false;
        }
      },
    });
  };
}
