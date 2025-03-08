import { getDefaultButtonVariants } from '../../animations';
import { FolderPlus } from '../../icons/folder-plus';
import { FolderXMark } from '../../icons/folder-xmark';
import { Pen } from '../../icons/pen';
import { MotionButton } from '../buttons';
import { DialogErrorText } from '../dialog';
import { Input } from '../input';

export function FolderDialogChildren({
  errorText,
  action,
  folderName,
}: {
  errorText: string;
  action: 'create' | 'rename' | 'delete';
  folderName?: string;
}) {
  if (action === 'delete')
    return (
      <>
        <fieldset>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Are you sure you want to{' '}
            <span className="text-red-500">
              delete &quot;{folderName}&quot;
            </span>{' '}
            and send its notes to the trash bin?
          </p>
          <DialogErrorText errorText={errorText} />
        </fieldset>
        <MotionButton
          type="submit"
          {...getDefaultButtonVariants()}
          className="w-[calc(100%-1.5rem)] mx-auto justify-center"
        >
          <FolderXMark /> <span>Move to Trash</span>
        </MotionButton>
      </>
    );

  return (
    <>
      <fieldset className="flex flex-col">
        <Input
          label="New Folder Name"
          labelProps={{ htmlFor: 'folder-name' }}
          inputProps={{
            id: 'folder-name',
            name: 'folder-name',
            placeholder: 'My Todos',
            autoFocus: true,
            defaultValue: action === 'rename' ? folderName : '',
          }}
        />
        <DialogErrorText errorText={errorText} />
      </fieldset>
      <MotionButton
        {...getDefaultButtonVariants(false, 1.05, 0.95, 1.05)}
        className="w-[calc(100%-1.5rem)] mx-auto justify-center"
        type="submit"
      >
        <span>{action === 'create' ? 'Create' : 'Rename'} Folder</span>{' '}
        {action === 'create' ? (
          <FolderPlus className="will-change-transform" />
        ) : (
          <Pen className="will-change-transform" />
        )}
      </MotionButton>
    </>
  );
}
