import { useState } from 'react';
import { Input } from '../../components/input';
import { DialogErrorText } from '../../components/dialog';
import { MotionButton } from '../../components/buttons';
import { getDefaultButtonVariants } from '../../animations';
import { FilePen } from '../../icons/file-pen';
import { extractInfoFromNoteName } from '../../utils/string-formatting';

export function RenameFileDialogChildren({
  selectedNote,
  errorText,
  isInTagsSidebar,
}: {
  selectedNote: string;
  errorText: string;
  isInTagsSidebar: boolean;
}) {
  // selectedNote comes in as "note:folder/filename?ext=md" or "note:filename?ext=md"
  const noteWithoutPrefix = selectedNote.split(':')[1] || '';

  const notePathParts = isInTagsSidebar
    ? noteWithoutPrefix.split('/')
    : [noteWithoutPrefix];
  const originalFileName = notePathParts[notePathParts.length - 1];

  const { noteNameWithoutExtension, queryParams } =
    extractInfoFromNoteName(originalFileName);
  const fileExtension = queryParams.ext;

  const [newFileName, setNewFileName] = useState(noteNameWithoutExtension);

  return (
    <fieldset className="flex flex-col gap-3">
      <div className="flex flex-col">
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
            placeholder: 'Enter new file name',
            className: 'text-sm',
            autoCapitalize: 'off',
            autoComplete: 'off',
            spellCheck: 'false',
            type: 'text',
          }}
        />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Current name: {noteNameWithoutExtension}.{fileExtension}
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
