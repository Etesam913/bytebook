import { useSetAtom } from 'jotai/react';
import { navigate } from 'wouter/use-browser-location';
import { AddNoteToFolder } from '../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { getDefaultButtonVariants } from '../animations';
import { dialogDataAtom } from '../atoms';
import { MotionButton } from '../components/buttons';
import { DialogErrorText } from '../components/dialog';
import { Input } from '../components/input';
import { Compose } from '../icons/compose';
import {
  validateName,
  convertFilePathToQueryNotation,
} from '../utils/string-formatting';

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
            {...getDefaultButtonVariants({ disabled: false, whileHover: 1.05, whileTap: 0.95, whileFocus: 1.05 })}
            className="w-[calc(100%-1.5rem)] mx-auto text-center justify-center"
            type="submit"
          >
            <span>Create Note</span> <Compose />
          </MotionButton>
        </>
      ),
      onSubmit: async (e, setErrorText) => {
        const formData = new FormData(e.target as HTMLFormElement);
        try {
          const newNoteName = formData.get('note-name');
          const { isValid, errorMessage } = validateName(newNoteName, 'note');
          if (!isValid) throw new Error(errorMessage);
          if (newNoteName) {
            const newNoteNameString = newNoteName.toString().trim();
            const res = await AddNoteToFolder(
              decodeURIComponent(folder),
              newNoteNameString
            );
            if (!res.success) throw new Error(res.message);
            navigate(
              `/${convertFilePathToQueryNotation(`${folder}/${encodeURIComponent(newNoteNameString)}.md`)}`
            );

            return true;
          }
          return false;
        } catch (e) {
          if (e instanceof Error) {
            setErrorText(e.message);
          } else {
            setErrorText('An unknown error occurred');
          }
          return false;
        }
      },
    });
  };
}
