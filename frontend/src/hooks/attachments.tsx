import { useMutation } from '@tanstack/react-query';
import { useSetAtom } from 'jotai/react';
import { $getSelection, type BaseSelection, type LexicalEditor } from 'lexical';
import { backendQueryAtom } from '@/atoms';
import { insertAttachmentFromFile } from '@components/editor/utils/toolbar';

// Opens a file picker and inserts the selected file as an attachment at the current editor selection position.
export function useAttachmentsMutation({
  folder,
  editor,
}: {
  folder: string;
  editor: LexicalEditor;
}) {
  const setBackendQuery = useSetAtom(backendQueryAtom);
  const insertAttachmentsMutation = useMutation({
    mutationFn: async () => {
      let editorSelection: BaseSelection | null = null;
      editor.read(() => {
        editorSelection = $getSelection();
      });
      await insertAttachmentFromFile({
        folder,
        editor,
        editorSelection,
      });
    },
    onMutate: () => {
      setBackendQuery({
        isLoading: true,
        message: 'Inserting Attachments',
      });
    },
    onSettled: () => {
      setBackendQuery({
        isLoading: false,
        message: '',
      });
    },
  });

  return { insertAttachmentsMutation };
}
