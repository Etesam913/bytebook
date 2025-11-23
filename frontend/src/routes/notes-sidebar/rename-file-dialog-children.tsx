import { useState } from 'react';
import { Input } from '../../components/input';
import { DialogErrorText } from '../../components/dialog';
import { MotionButton } from '../../components/buttons';
import { getDefaultButtonVariants } from '../../animations';
import { FilePen } from '../../icons/file-pen';
import { LocalFilePath } from '../../utils/string-formatting';

export function RenameFileDialogChildren({
  selectedFilePath,
  errorText,
}: {
  selectedFilePath: LocalFilePath;
  errorText: string;
}) {
  const [newFileName, setNewFileName] = useState(
    selectedFilePath.noteWithoutExtension
  );

  return (
    <fieldset className="flex flex-col gap-3 w-full max-w-full">
      <div className="flex flex-col w-full max-w-full">
        <Input
          label="Enter a new name for the file"
          labelProps={{
            children: 'File name',
            className: 'text-sm font-medium text-zinc-700 dark:text-zinc-300',
            htmlFor: 'new-file-name',
          }}
          inputProps={{
            id: 'new-file-name',
            name: 'new-file-name',
            autoFocus: true,
            value: newFileName,
            onChange: (e) => setNewFileName(e.target.value),
            onFocus: (e) => e.target.select(),
            placeholder: 'Enter new file name',
            maxLength: 255,
            autoCapitalize: 'off',
            autoComplete: 'off',
            spellCheck: 'false',
            type: 'text',
          }}
        />
      </div>
      <p className="text-sm flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
        <span
          className="inline-block max-w-full break-all"
          style={{ wordBreak: 'break-all' }}
          title={`${newFileName}.${selectedFilePath.noteExtension}`}
        >
          Current name: {newFileName}.{selectedFilePath.noteExtension}
        </span>
      </p>
      <DialogErrorText errorText={errorText} />
      <MotionButton
        className="w-[calc(100%-4rem)] mx-auto text-center justify-center"
        type="submit"
        {...getDefaultButtonVariants()}
      >
        <span>Rename</span>
        <FilePen width={17} height={17} className="will-change-transform" />
      </MotionButton>
    </fieldset>
  );
}
