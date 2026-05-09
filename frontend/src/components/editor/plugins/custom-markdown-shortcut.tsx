import { registerMarkdownShortcuts, type Transformer } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

export function CustomMarkdownShortcutPlugin({
  transformers,
}: {
  transformers: Array<Transformer>;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerMarkdownShortcuts(editor, transformers);
  }, [editor, transformers]);
  return null;
}
