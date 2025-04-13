import { useMutation } from '@tanstack/react-query';
import { useSetAtom } from 'jotai/react';
import { $getSelection, type BaseSelection, type LexicalEditor } from 'lexical';
import { toast } from 'sonner';
import { backendQueryAtom } from '../atoms';
import { insertAttachmentFromFile } from '../components/editor/utils/toolbar';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';

export function useAttachmentsMutation({
  folder,
  note,
  editor,
}: {
  folder: string;
  note: string;
  editor: LexicalEditor;
}) {
  const setBackendQuery = useSetAtom(backendQueryAtom);
  const insertAttachmentsMutation = useMutation({
    mutationFn: async () => {
      let editorSelection: BaseSelection | null = null;
      editor.read(() => {
        editorSelection = $getSelection();
      });
      setBackendQuery({
        isLoading: true,
        message: 'Inserting Attachments',
      });
      await insertAttachmentFromFile(folder, note, editor, editorSelection);
    },
    onSuccess: () => {
      setBackendQuery({
        isLoading: false,
        message: '',
      });
    },
    onError: () => {
      setBackendQuery({
        isLoading: false,
        message: '',
      });
      toast.error(
        'An Unknown Error Occurred. Please Try Again Later',
        DEFAULT_SONNER_OPTIONS
      );
    },
  });

  return { insertAttachmentsMutation };
}
