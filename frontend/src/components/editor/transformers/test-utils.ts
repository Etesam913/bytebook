import { createEditor } from 'lexical';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
// Enter the transformers <-> nodes import cycle via the index, as the app does
import { CUSTOM_TRANSFORMERS } from './index';
import { editorConfig } from '../editor-config';

/** Imports markdown into a headless editor with the app's nodes and exports it back. */
export function roundTripMarkdown(markdown: string) {
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
  let output = '';
  editor.read(() => {
    output = $convertToMarkdownString(CUSTOM_TRANSFORMERS, undefined, true);
  });
  return output;
}
