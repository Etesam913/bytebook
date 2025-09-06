import { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { $nodesOfType } from 'lexical';
import {
  editorAtom,
  isNoteSearchOpenAtom,
  noteContainerRefAtom,
  noteSearchValueAtom,
} from '../atoms';
import { CodeNode } from '../nodes/code';
import { useSendInterruptRequestMutation } from '../../../hooks/code';

export function useCodeCleanup(
  noteContainerRef: React.RefObject<HTMLDivElement | null>
) {
  const [editor, setEditor] = useAtom(editorAtom);
  const setIsSearchOpen = useSetAtom(isNoteSearchOpenAtom);
  const setSearchValue = useSetAtom(noteSearchValueAtom);
  const setNoteContainerRef = useSetAtom(noteContainerRefAtom);
  const { mutate: interruptExecution } = useSendInterruptRequestMutation();

  useEffect(() => {
    setNoteContainerRef(noteContainerRef);

    return () => {
      // Resets some state
      setNoteContainerRef(null);
      setEditor(null);
      setIsSearchOpen(false);
      console.log('state reset');
      setSearchValue('');

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
  }, [noteContainerRef]);
}
