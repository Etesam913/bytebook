import { SettingsDialog } from '@components/settings-dialog';
import { useSetAtom } from 'jotai/react';
import { getDefaultButtonVariants } from '@/animations';
import { dialogDataAtom } from '@/atoms';
import { MotionButton } from '@components/buttons';
import { DialogErrorText } from '@components/dialog';
import { AppNumberField, AppTextField } from '@components/input';
import { useSaveSearchMutation } from './search';
import { useEditTagsFormMutation } from './tags';
import { EditTagDialogChildren } from '@/routes/notes-sidebar/edit-tag-dialog-children';
import { BookBookmark } from '@/icons/book-bookmark';
import { Table } from '@/icons/table';
import type { LexicalEditor, RangeSelection } from 'lexical';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $setSelection } from 'lexical';
import {
  MAX_TABLE_COLUMNS,
  MAX_TABLE_ROWS,
} from '@components/editor/utils/table';

/**
 * Custom hook that returns a function to open a "Save Search" dialog.
 *
 * When invoked with a search query, this function opens a dialog allowing the user to enter a name for the search.
 * On submission, it saves the search query with the given name.
 *
 * @returns {(searchQuery: string) => void} Function to open the save search dialog for the specified query.
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

/**
 * Custom hook that returns a function to open a "Create Table" dialog.
 *
 * When invoked with an editor and selection, this function opens a dialog allowing the user to specify
 * the number of rows and columns for a new table. On submission, it creates a table with the specified
 * dimensions at the stored selection location.
 *
 * @returns {(editor: LexicalEditor, editorSelection: RangeSelection | null) => void}
 *
 * Usage:
 *   const openCreateTableDialog = useCreateTableDialog();
 *   openCreateTableDialog(editor, selection);
 */
export function useCreateTableDialog(): (
  editor: LexicalEditor,
  editorSelection: RangeSelection | null
) => void {
  const setDialogData = useSetAtom(dialogDataAtom);

  return (editor: LexicalEditor, editorSelection: RangeSelection | null) => {
    setDialogData({
      isOpen: true,
      isPending: false,
      title: 'Create Table',
      children: (errorText) => (
        <>
          <fieldset className="flex flex-col gap-3">
            <AppNumberField
              label="Rows"
              id="table-rows"
              name="table-rows"
              defaultValue={3}
              minValue={1}
              maxValue={MAX_TABLE_ROWS}
              autoFocus
            />
            <AppNumberField
              label="Columns"
              id="table-columns"
              name="table-columns"
              defaultValue={3}
              minValue={1}
              maxValue={MAX_TABLE_COLUMNS}
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
            <span>Create Table</span>
            <Table width="1.25rem" height="1.25rem" />
          </MotionButton>
        </>
      ),
      onSubmit: (formData, setErrorText) => {
        // NumberField clamps to [1, MAX]; only a blank field reaches here invalid.
        const rows = formData.get('table-rows') as string;
        const columns = formData.get('table-columns') as string;

        if (!rows) {
          setErrorText(
            `Please enter a valid number of rows (1-${MAX_TABLE_ROWS})`
          );
          return Promise.resolve(false);
        }

        if (!columns) {
          setErrorText(
            `Please enter a valid number of columns (1-${MAX_TABLE_COLUMNS})`
          );
          return Promise.resolve(false);
        }

        try {
          // Clone the selection to avoid stale selection issues
          const clonedSelection = editorSelection?.clone();

          editor.update(() => {
            if (clonedSelection) {
              $setSelection(clonedSelection);
            }
            editor.dispatchCommand(INSERT_TABLE_COMMAND, {
              columns: columns,
              rows: rows,
              includeHeaders: true,
            });
          });

          return Promise.resolve(true);
        } catch (error) {
          setErrorText(
            error instanceof Error ? error.message : 'Failed to create table'
          );
          return Promise.resolve(false);
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
      children: () => <SettingsDialog />,
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
      onSubmit: async (formData, setErrorText) => {
        try {
          return await editTags({ formData, setErrorText, filePaths });
        } catch {
          // onError fills in the dialog's error text; keep it open.
          return false;
        }
      },
    });
  };
}
