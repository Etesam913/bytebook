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
import { Table } from '../icons/table';
import type { LexicalEditor, RangeSelection } from 'lexical';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $setSelection } from 'lexical';
import { useFolderCreateMutation } from './folders';
import { CreateFolderDialog } from '../components/folder-sidebar/my-folders-accordion/folder-dialog-children';
import { useRenameFileMutation } from './notes';
import { RenameFileDialogChildren } from '../routes/notes-sidebar/rename-file-dialog-children';
import { LocalFilePath } from '../utils/string-formatting';
import { navigate } from 'wouter/use-browser-location';

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
            <div className="flex flex-col">
              <Input
                label="Rows"
                labelProps={{ htmlFor: 'table-rows' }}
                inputProps={{
                  id: 'table-rows',
                  name: 'table-rows',
                  placeholder: '3',
                  defaultValue: '3',
                  autoFocus: true,
                  onFocus: (e) => e.target.select(),
                  type: 'number',
                  min: '1',
                  max: '100',
                }}
              />
            </div>
            <div className="flex flex-col">
              <Input
                label="Columns"
                labelProps={{ htmlFor: 'table-columns' }}
                inputProps={{
                  id: 'table-columns',
                  name: 'table-columns',
                  placeholder: '3',
                  defaultValue: '3',
                  type: 'number',
                  min: '1',
                  max: '10',
                }}
              />
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
            <span>Create Table</span>
            <Table width={20} height={20} />
          </MotionButton>
        </>
      ),
      onSubmit: async (e, setErrorText) => {
        const formData = new FormData(e.target as HTMLFormElement);
        const rows = formData.get('table-rows') as string;
        const columns = formData.get('table-columns') as string;

        const rowsNum = Number.parseInt(rows, 10);
        const columnsNum = Number.parseInt(columns, 10);

        if (!rows || Number.isNaN(rowsNum) || rowsNum < 1 || rowsNum > 100) {
          setErrorText('Please enter a valid number of rows (1-100)');
          return false;
        }

        if (
          !columns ||
          Number.isNaN(columnsNum) ||
          columnsNum < 1 ||
          columnsNum > 20
        ) {
          setErrorText('Please enter a valid number of columns (1-10)');
          return false;
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

          return true;
        } catch (error) {
          setErrorText(
            error instanceof Error ? error.message : 'Failed to create table'
          );
          return false;
        }
      },
    });
  };
}

/**
 * Custom hook that returns a function to open a "Create Folder" dialog.
 *
 * When invoked, this function opens a dialog allowing the user to enter a new folder name.
 * On submission, it validates the folder name, attempts to create the folder,
 * and navigates to the new folder if successful. If an error occurs, it displays an error message in the dialog.
 *
 * @returns {() => void} Function to open the create folder dialog.
 *
 */
export function useCreateFolderDialog(): () => void {
  const setDialogData = useSetAtom(dialogDataAtom);
  const { mutateAsync: createFolder } = useFolderCreateMutation();

  return () => {
    setDialogData({
      isOpen: true,
      title: 'Create Folder',
      isPending: false,
      children: (errorText) => <CreateFolderDialog errorText={errorText} />,
      onSubmit: async (e, setErrorText) =>
        createFolder({
          e: e,
          setErrorText: setErrorText,
        }),
    });
  };
}

/**
 * Custom hook that returns a function to open a "Rename File" dialog.
 *
 * When invoked with a file path, this function opens a dialog allowing the user to enter a new file name.
 * On submission, it validates the new file name, attempts to rename the file,
 * and navigates to the renamed file if successful. If an error occurs, it displays an error message in the dialog.
 *
 * @returns {(filePath: LocalFilePath) => void} Function to open the rename file dialog for the specified file path.
 *
 * Usage:
 *   const openRenameFileDialog = useRenameFileDialog();
 *   openRenameFileDialog(filePath);
 */
export function useRenameFileDialog(): (filePath: LocalFilePath) => void {
  const setDialogData = useSetAtom(dialogDataAtom);
  const { mutateAsync: renameFile } = useRenameFileMutation();

  return (filePath: LocalFilePath) => {
    setDialogData({
      isOpen: true,
      isPending: false,
      title: 'Rename File',
      dialogClassName: 'w-[min(25rem,90vw)]',
      children: (errorText) => (
        <RenameFileDialogChildren
          selectedFilePath={filePath}
          errorText={errorText}
        />
      ),
      onSubmit: async (e, setErrorText) => {
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const newFileName = formData.get('new-file-name') as string;
        if (!newFileName) {
          setErrorText('Please enter a new file name');
          return false;
        }

        const newFilePath = new LocalFilePath({
          folder: filePath.folder,
          note: `${newFileName}.${filePath.noteExtension}`,
        });

        const result = await renameFile({
          oldPath: filePath,
          newPath: newFilePath,
          setErrorText,
        });

        if (result) {
          navigate(newFilePath.getLinkToNote());
          return true;
        }

        return false;
      },
    });
  };
}
