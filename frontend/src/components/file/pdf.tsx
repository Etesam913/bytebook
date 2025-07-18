import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { AnimatePresence } from 'motion/react';
import { useAtomValue } from 'jotai';
import { draggedElementAtom } from '../../atoms';
import { cn } from '../../utils/string-formatting';
import { NoteComponentControls } from '../note-component-container/component-controls';

export function Pdf({
  src,
  alt,
  nodeKey,
}: {
  src: string;
  alt: string;
  nodeKey: string;
}) {
  const [editor] = useLexicalComposerContext();
  const draggedElement = useAtomValue(draggedElementAtom);
  const [isSelected] = useLexicalNodeSelection(nodeKey);

  return (
    <div className="mr-2 relative pt-[100%] h-0 w-full">
      <div
        data-interactable="true"
        data-node-key={nodeKey}
        className={cn(
          'px-1 w-full h-full absolute top-0 left-0 bg-zinc-100 dark:bg-zinc-700 rounded-md py-1 border-[3px] border-zinc-200 dark:border-zinc-600 text-xs transition-colors',
          isSelected && 'border-(--accent-color)'
        )}
      >
        <AnimatePresence>
          {isSelected && (
            <NoteComponentControls
              buttonOptions={{
                trash: {
                  enabled: true,
                },
                link: {
                  enabled: true,
                  src,
                },
              }}
              nodeKey={nodeKey}
              editor={editor}
            />
          )}
        </AnimatePresence>
        <div className="px-1 pb-1 pointer-events-none">{alt}</div>
        <iframe
          title={alt}
          className={cn(
            'w-full h-[calc(100%-1.4rem)] rounded-md',
            draggedElement && 'pointer-events-none'
          )}
          src={src}
        />
      </div>
    </div>
  );
}
