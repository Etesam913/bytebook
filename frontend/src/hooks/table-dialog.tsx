import { useSetAtom } from 'jotai/react';
import { getDefaultButtonVariants } from '@/animations';
import { dialogDataAtom } from '@/atoms';
import { MotionButton } from '@components/buttons';
import { DialogErrorText } from '@components/dialog';
import { AppNumberField } from '@components/input';
import type { LexicalEditor, RangeSelection } from 'lexical';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $setSelection } from 'lexical';
import {
  MAX_TABLE_COLUMNS,
  MAX_TABLE_ROWS,
} from '@components/editor/utils/table';
import { Table } from '@/icons/table';

/*
 * Custom hook that returns a function to open a "Create Table" dialog.
 *
 * When invoked with an editor and selection, this function opens a dialog allowing the user to specify
 * the number of rows and columns for a new table. On submission, it creates a table with the specified
 * dimensions at the stored selection location.
 *
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
