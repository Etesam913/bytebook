import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import { COMMAND_PRIORITY_LOW, type LexicalEditor } from 'lexical';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import type { ResizeState } from '../types';
import { EXPAND_CONTENT_COMMAND } from '../utils/commands';

export function useResizeState(
  nodeKey: string
): ResizeState & { clearSelection: () => void } {
  const [isResizing, setIsResizing] = useState(false);
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const [isExpanded, setIsExpanded] = useState(false);
  return {
    isResizing,
    setIsResizing,
    isSelected,
    setSelected,
    clearSelection,
    isExpanded,
    setIsExpanded,
  };
}

export function useResizeCommands(
  editor: LexicalEditor,
  isExpanded: boolean,
  setIsExpanded: Dispatch<SetStateAction<boolean>>,
  isSelected: boolean,
  nodeKey: string,
  clearSelection: () => void,
  elementRef: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    return mergeRegister(
      // editor.registerCommand<KeyboardEvent>(
      // 	KEY_ENTER_COMMAND,
      // 	(e) => {
      // 		if (disabledEvents?.enter) return false;
      // 		if (!isExpanded) {
      // 			return enterKeyDecoratorNodeCommand(e, nodeKey);
      // 		}
      // 		e.preventDefault();
      // 		e.stopPropagation();
      // 		return true;
      // 	},
      // 	isExpanded || isSelected ? COMMAND_PRIORITY_HIGH : COMMAND_PRIORITY_LOW,
      // ),
      editor.registerCommand<string>(
        EXPAND_CONTENT_COMMAND,
        (keyToExpand) => {
          if (keyToExpand === nodeKey) {
            setIsExpanded(true);
            elementRef.current?.scrollIntoView({
              block: 'end',
            });
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [
    editor,
    nodeKey,
    isExpanded,
    setIsExpanded,
    isSelected,
    elementRef.current,
    clearSelection,
  ]);
}
