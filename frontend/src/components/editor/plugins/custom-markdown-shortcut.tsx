import { TRANSFORMERS } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { registerMarkdownShortcuts } from '../MarkdownShortcuts';

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
