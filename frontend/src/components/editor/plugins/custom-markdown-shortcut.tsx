import { registerMarkdownShortcuts, TRANSFORMERS } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

export function CustomMarkdownShortcutPlugin({
  transformers = TRANSFORMERS,
}: {
  transformers?: typeof TRANSFORMERS;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerMarkdownShortcuts(editor, transformers);
  }, [editor, transformers]);
  return null;
}
