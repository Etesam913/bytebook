import { createEditor, type LexicalEditor } from 'lexical';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
// Enter the transformers <-> nodes import cycle via the index, as the app does
import { CUSTOM_TRANSFORMERS } from './index';
import { editorConfig } from '../editor-config';

/** Creates a headless editor with the app's nodes and imports markdown into it. */
export function importMarkdown(markdown: string): LexicalEditor {
  const editor = createEditor({
    nodes: editorConfig.nodes,
    onError: (error) => {
      throw error;
    },
  });
  editor.update(
    () => {
      $convertFromMarkdownString(
        markdown,
        CUSTOM_TRANSFORMERS,
        undefined,
        true
      );
    },
    { discrete: true }
  );
  return editor;
}

/** Imports markdown into a headless editor with the app's nodes and exports it back. */
export function roundTripMarkdown(markdown: string) {
  let output = '';
  importMarkdown(markdown).read(() => {
    output = $convertToMarkdownString(CUSTOM_TRANSFORMERS, undefined, true);
  });
  return output;
}
