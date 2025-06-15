import { useEffect, useState } from 'react';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  LexicalEditor,
} from 'lexical';

/**
 * A React hook that tracks whether a specific node is part of the current node selection in a Lexical editor.
 * isSelected from useLexicalNodeSelection cannot be used as it also determines when a node is in a range selcetion
 * @param editor - The Lexical editor instance to monitor
 * @param key - The key of the node to check for selection
 * @returns A boolean indicating whether the specified node is currently in a node selection
 */
export function useNodeInNodeSelection(editor: LexicalEditor, key: string) {
  const [isInNodeSelection, setIsInNodeSelection] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const unregister = editor.registerUpdateListener(() => {
      if (isMounted) {
        editor.read(() => {
          const node = $getNodeByKey(key);
          if (!node) {
            setIsInNodeSelection(false);
            return;
          }

          const selection = $getSelection();
          if (!$isNodeSelection(selection)) {
            setIsInNodeSelection(false);
            return;
          }
          selection?.getNodes().forEach((node) => {
            if (node.getKey() === key) {
              setIsInNodeSelection(true);
            }
          });
        });
      }
    });

    return () => {
      isMounted = false; // Prevent updates after component unmount.
      unregister();
    };
  }, [editor, key]);

  return isInNodeSelection;
}
