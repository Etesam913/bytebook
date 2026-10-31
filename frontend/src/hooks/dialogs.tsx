import { lazy, Suspense } from 'react';
import { Loader } from '@/icons/loader';
import { useSetAtom } from 'jotai/react';
import { getDefaultButtonVariants } from '@/animations';
import { dialogDataAtom } from '@/atoms';
import { MotionButton } from '@components/buttons';
import { DialogErrorText } from '@components/dialog';
import { AppTextField } from '@components/input';
import { useSaveSearchMutation } from './search';
import { useEditTagsFormMutation } from './tags';
import { EditTagDialogChildren } from '@/routes/notes-sidebar/edit-tag-dialog-children';
import { BookBookmark } from '@/icons/book-bookmark';

const SettingsDialog = lazy(() =>
  import('@components/settings-dialog').then((module) => ({
    default: module.SettingsDialog,
  }))
);

/*
 * Custom hook that returns a function to open a "Save Search" dialog.
 *
 * When invoked with a search query, this function opens a dialog allowing the user to enter a name for the search.
 * On submission, it saves the search query with the given name.
 *
 * Returns function to open the save search dialog for the specified query.
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
            <AppTextField
              label="Search Name"
              id="search-name"
              name="search-name"
              placeholder="Grocery Lists"
              autoFocus
              autoCapitalize="off"
              autoComplete="off"
              spellCheck="false"
              type="text"
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
            <BookBookmark height="1.25rem" width="1.25rem" />
          </MotionButton>
        </>
      ),
      onSubmit: async (formData, setErrorText) => {
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

// Shared by the settings button, native menu event, and command palette.
export function useOpenSettingsDialog() {
  const setDialogData = useSetAtom(dialogDataAtom);
  return () =>
    setDialogData({
      isOpen: true,
      isPending: false,
      title: 'Settings',
      dialogClassName: 'w-[min(55rem,90vw)] rounded-2xl',
      children: () => (
        <Suspense
          fallback={
            <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
              <Loader />
            </div>
          }
        >
          <SettingsDialog />
        </Suspense>
      ),
      onSubmit: () => Promise.resolve(true),
    });
}

/**
 * Returns a function that opens the "Edit Tags" dialog for the given note paths.
 * Takes the paths per call so context-menu factories can reuse it.
 */
export function useOpenEditTagsDialog() {
  const setDialogData = useSetAtom(dialogDataAtom);
  const { mutateAsync: editTags } = useEditTagsFormMutation();

  return (filePaths: string[]) => {
    setDialogData({
      isOpen: true,
      isPending: false,
      title: 'Edit Tags',
      dialogClassName: 'w-[min(30rem,90vw)]',
      children: (errorText) => (
        <EditTagDialogChildren filePaths={filePaths} errorText={errorText} />
      ),
      onSubmit: (formData) => editTags({ formData, filePaths }),
    });
  };
}
