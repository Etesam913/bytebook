import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $createNodeSelection,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  type DecoratorNode,
  type LexicalCommand,
  createCommand,
} from 'lexical';
import { JSX, useEffect } from 'react';

export const FOCUS_NODE_COMMAND: LexicalCommand<DecoratorNode<JSX.Element>> =
  createCommand('FOCUS_NODE_COMMAND');

export function FocusPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<DecoratorNode<JSX.Element>>(
        FOCUS_NODE_COMMAND,
        (newNode) => {
          const nodeSelection = $createNodeSelection();
          nodeSelection.add(newNode.getKey());
          $setSelection(nodeSelection);
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      )
    );
  });
  return null;
}
