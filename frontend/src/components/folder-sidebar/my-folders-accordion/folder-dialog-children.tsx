import { getDefaultButtonVariants } from '../../../animations';
import { FolderPlus } from '../../../icons/folder-plus';
import { FolderXMark } from '../../../icons/folder-xmark';
import { Pen } from '../../../icons/pen';
import { MotionButton } from '../../buttons';
import { DialogErrorText } from '../../dialog';
import { Input } from '../../input';

export function CreateFolderDialog({ errorText }: { errorText: string }) {
  return (
    <>
      <fieldset className="flex flex-col py-2">
        <Input
          label="New Folder Name"
          labelProps={{ htmlFor: 'folder-name' }}
          inputProps={{
            id: 'folder-name',
            name: 'folder-name',
            placeholder: 'My Todos',
            autoFocus: true,
            onFocus: (e) => e.target.select(),
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
        className="w-[calc(100%-1.5rem)] mx-auto justify-center"
        type="submit"
      >
        <span>Create Folder</span>{' '}
        <FolderPlus className="will-change-transform" />
      </MotionButton>
    </>
  );
}

export function RenameFolderDialog({
  errorText,
  folderName,
}: {
  errorText: string;
  folderName: string;
}) {
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
            onFocus: (e) => e.target.select(),
            defaultValue: folderName,
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
        className="w-[calc(100%-1.5rem)] mx-auto justify-center"
        type="submit"
      >
        <span>Rename Folder</span> <Pen className="will-change-transform" />
      </MotionButton>
    </>
  );
}

export function DeleteFolderDialog({
  errorText,
  folderName,
}: {
  errorText: string;
  folderName: string;
}) {
  return (
    <>
      <fieldset>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Are you sure you want to{' '}
          <span className="text-red-500">delete &quot;{folderName}&quot;</span>{' '}
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
}
