import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { KernelLanguageHeartbeat } from './kernel-language-heartbeat';
import { useEffect, useState } from 'react';
import { CodeNode } from '../nodes/code';
import { $nodesOfType } from 'lexical';
import { Languages } from '../../../types';

export function KernelHeartbeats() {
  const [editor] = useLexicalComposerContext();
  const [languagesPresentInNote, setLanguagesPresentInNote] = useState<
    Set<Languages>
  >(new Set());

  useEffect(() => {
    const removeMutationListener = editor.registerMutationListener(
      CodeNode,
      () => {
        const tempLanguagesPresentInNote = new Set<Languages>();
        editor.read(() => {
          const allCodeNodes = $nodesOfType(CodeNode);
          allCodeNodes.forEach((node) => {
            const language = node.getLanguage();
            tempLanguagesPresentInNote.add(language);
          });
        });
        setLanguagesPresentInNote(tempLanguagesPresentInNote);
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
