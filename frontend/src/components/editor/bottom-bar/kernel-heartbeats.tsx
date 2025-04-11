import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { KernelLanguageHeartbeat } from './kernel-language-heartbeat';
import { useEffect, useState } from 'react';
import { CodeNode } from '../nodes/code';
import { $getNodeByKey, $nodesOfType } from 'lexical';
import { Languages } from '../../../types';
import { useSendInterruptRequestMutation } from '../../../hooks/code';

export function KernelHeartbeats() {
  const [editor] = useLexicalComposerContext();
  const [languagesPresentInNote, setLanguagesPresentInNote] = useState<
    Set<Languages>
  >(new Set());

  const { mutate: interruptExecution } = useSendInterruptRequestMutation();

  useEffect(() => {
    const removeMutationListener = editor.registerMutationListener(
      CodeNode,
      (mutationsMap, { prevEditorState }) => {
        // Manages the languages that exist in the note
        const tempLanguagesPresentInNote = new Set<Languages>();
        editor.read(() => {
          const allCodeNodes = $nodesOfType(CodeNode);
          allCodeNodes.forEach((node) => {
            const language = node.getLanguage();
            tempLanguagesPresentInNote.add(language);
          });
        });

        setLanguagesPresentInNote(tempLanguagesPresentInNote);
        // Manages interrupting ongoing requests for deleted code nodes
        mutationsMap.forEach((mutation, nodeKey) => {
          if (mutation === 'destroyed') {
            prevEditorState.read(() => {
              const codeBlockNode = $getNodeByKey(nodeKey) as
                | CodeNode
                | undefined;
              if (codeBlockNode) {
                const codeBlockId = codeBlockNode.getId();
                interruptExecution({
                  codeBlockId,
                  newExecutionId: '',
                });
              }
            });
          }
        });
      }
    );

    return () => {
      removeMutationListener();
    };
  }, []);

  const kernelLanguageHeartbeats = [...languagesPresentInNote].map(
    (language) => <KernelLanguageHeartbeat key={language} language={language} />
  );
  if (kernelLanguageHeartbeats.length === 0) return null;
  return <span className="flex gap-1.5">{kernelLanguageHeartbeats}</span>;
}
