import '@excalidraw/excalidraw/index.css';
import { Excalidraw, MainMenu, THEME } from '@excalidraw/excalidraw';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import { AnimatePresence, motion } from 'motion/react';
import { useAtomValue } from 'jotai';
import {
  CLICK_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  KEY_ESCAPE_COMMAND,
} from 'lexical';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { isDarkModeOnAtom } from '../../atoms';
import { XMark } from '../../icons/circle-xmark';
import { onClickDecoratorNodeCommand } from '../../utils/commands';
import { debounce } from '../../utils/general';
import { cn } from '../../utils/string-formatting';
import { NoteComponentControls } from '../note-component-container/component-controls';
import { useFocusOnSelect } from './hooks';

import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

function writeElementsToNodeWrapper(
  excalidrawAPIRef: RefObject<ExcalidrawImperativeAPI | null>,
  writeElementsToNode: (elements: NonDeletedExcalidrawElement[]) => void
) {
  return debounce(() => {
    if (excalidrawAPIRef.current) {
      const elements = excalidrawAPIRef.current.getSceneElements();
      writeElementsToNode(elements as NonDeletedExcalidrawElement[]);
    }
  }, 300);
}

export function ExcalidrawComponent({
  nodeKey,
  isCreatedNow,
  defaultElements,
  writeElementsToNode,
}: {
  nodeKey: string;
  isCreatedNow: boolean;
  defaultElements: ExcalidrawElement[];
  writeElementsToNode: (elements: NonDeletedExcalidrawElement[]) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const excalidrawRef = useRef<HTMLDivElement>(null);
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);

  useFocusOnSelect(isSelected, excalidrawRef);
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const [isExpanded, setIsExpanded] = useState(false);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // Using data-interactable does not work for this component so this registerCommand is needed
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (e) => {
          e.stopPropagation();
          return onClickDecoratorNodeCommand(
            e,
            excalidrawRef.current,
            setSelected,
            clearSelection
          );
        },
        COMMAND_PRIORITY_NORMAL
      )
    );
  }, []);

  return (
    <div
      className={cn(
        'relative w-full border-[4px] border-zinc-100 dark:border-zinc-900 transition-colors',
        isSelected && !isExpanded && 'border-(--accent-color)!',
        isExpanded &&
          'h-screen fixed top-0 left-0 right-0 bottom-0 z-30 m-auto justify-start overflow-auto'
      )}
      ref={excalidrawRef}
    >
      {isExpanded && (
        <motion.button
          {...getDefaultButtonVariants()}
          onClick={() => {
            setIsExpanded(false);
            // A delay is needed for the setSelected to actually work for some reason
            setTimeout(() => {
              setSelected(true);
            }, 50);
          }}
          className="absolute z-50 right-5 top-4 bg-[rgba(0,0,0,0.55)] text-white p-1 rounded-full"
          type="submit"
        >
          <XMark width={24} height={24} />
        </motion.button>
      )}

      <AnimatePresence>
        {isSelected && !isExpanded && (
          <NoteComponentControls
            buttonOptions={{
              trash: {
                enabled: true,
              },
              fullscreen: {
                enabled: true,
                callback: () => {
                  setIsExpanded(true);
                },
              },
            }}
            nodeKey={nodeKey}
            editor={editor}
          />
        )}
      </AnimatePresence>
      <div
        onMouseUp={() =>
          writeElementsToNodeWrapper(excalidrawAPIRef, writeElementsToNode)()
        }
        onWheelCapture={(e) => {
          // Only allows scrolling inside the excalidraw editor when it is selected
          if (!isSelected) {
            e.stopPropagation();
          }
        }}
        onKeyUp={(e) => {
          // Fixes bug where escape key doesn't work in excalidraw editor even though it is a decorator node
          if (
            e.key === 'Escape' &&
            document.activeElement?.classList.contains('excalidraw-container')
          ) {
            editor.dispatchCommand(
              KEY_ESCAPE_COMMAND,
              undefined as unknown as KeyboardEvent
            );
          } else {
            writeElementsToNodeWrapper(excalidrawAPIRef, writeElementsToNode)();
          }
        }}
        className={cn('w-full h-[40rem]', isExpanded && 'h-screen')}
      >
        <Excalidraw
          initialData={{ elements: defaultElements, scrollToContent: true }}
          theme={isDarkModeOn ? THEME.DARK : THEME.LIGHT}
          // Handles the focus of the excalidraw editor
          autoFocus={isCreatedNow}
          excalidrawAPI={(api) => {
            excalidrawAPIRef.current = api;
            if (isCreatedNow) {
              // Handles the focus of the lexical editor
              setSelected(true);
            }
          }}
        >
          <MainMenu />
        </Excalidraw>
      </div>
    </div>
  );
}
