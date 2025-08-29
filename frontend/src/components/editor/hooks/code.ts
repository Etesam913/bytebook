import { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { $nodesOfType } from 'lexical';
import { editorAtom, noteContainerRefAtom } from '../atoms';
import { CodeNode } from '../nodes/code';
import { useSendInterruptRequestMutation } from '../../../hooks/code';

export function useCodeCleanup(
  noteContainerRef: React.RefObject<HTMLDivElement | null>
) {
  const [editor, setEditor] = useAtom(editorAtom);
  const setNoteContainerRef = useSetAtom(noteContainerRefAtom);
  const { mutate: interruptExecution } = useSendInterruptRequestMutation();

  useEffect(() => {
    setNoteContainerRef(noteContainerRef);

    return () => {
      // Resets some state
      setNoteContainerRef(null);
      setEditor(null);

      // Cancels ongoing requests for a code block when navigating away from the editor
      if (editor) {
        editor.read(() => {
          const allCodeNodes = $nodesOfType(CodeNode);
          allCodeNodes.forEach((codeNode) => {
            interruptExecution({
              codeBlockId: codeNode.getId(),
              codeBlockLanguage: codeNode.getLanguage(),
              newExecutionId: '',
            });
          });
        });
      }
    };
  }, [noteContainerRef, setNoteContainerRef, setEditor, editor, interruptExecution]);
}
