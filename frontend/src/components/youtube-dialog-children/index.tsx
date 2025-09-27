import { $getSelection, type BaseSelection, type LexicalEditor } from 'lexical';
import { type RefObject, useEffect, useRef } from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { Paperclip } from '../../icons/paperclip-2';
import { MotionButton } from '../buttons';
import { DialogErrorText } from '../dialog';
import { Input } from '../input';

export function YouTubeDialogChildren({
  editor,
  editorSelection,
  errorText,
}: {
  editor: LexicalEditor;
  editorSelection: RefObject<BaseSelection | null>;
  errorText: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    editor.update(() => {
      const selection = $getSelection();
      // eslint-disable-next-line react-hooks/react-compiler
      editorSelection.current = selection;
    });
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 200);
  }, [inputRef]);

  return (
    <>
      <fieldset className="flex flex-col">
        <Input
          ref={inputRef}
          label="YouTube Url"
          inputProps={{
            id: 'youtube-url',
            name: 'youtube-url',
            placeholder: 'https://www.youtube.com/watch?v=TgVhTXK-q74',
          }}
          labelProps={{ htmlFor: 'youtube-url' }}
          required
          error={errorText}
        />
      </fieldset>
      <MotionButton
        type="submit"
        {...getDefaultButtonVariants()}
        className="w-[calc(100%-1.5rem)] mx-auto justify-center"
      >
        Embed Video
        <Paperclip />
      </MotionButton>
    </>
  );
}
