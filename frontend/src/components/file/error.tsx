import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { AnimatePresence } from 'motion/react';
import { Paperclip } from '../../icons/paperclip-2';
import { TriangleWarning } from '../../icons/triangle-warning';
import { cn, Path } from '../../utils/string-formatting';
import { NoteComponentControls } from '../note-component-container/component-controls';

export function FileError({
  path,
  nodeKey,
  type,
}: {
  path: Path;
  nodeKey: string;
  type: 'loading-fail' | 'unknown-attachment';
}) {
  const src = path.getFileUrl();
  const [editor] = useLexicalComposerContext();
  const [isSelected] = useLexicalNodeSelection(nodeKey);

  return (
    <div
      data-node-key={nodeKey}
      data-interactable="true"
      className={cn(
        'max-w-80 inline-block relative bg-zinc-50 text-zinc-600 dark:text-zinc-300 dark:bg-zinc-700 rounded-md px-2 py-1 mx-1 border-4 border-solid border-zinc-200 dark:border-zinc-650 space-y-1.5',
        isSelected && 'border-(--accent-color)!'
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
                src: src,
              },
            }}
            nodeKey={nodeKey}
            editor={editor}
          />
        )}
      </AnimatePresence>
      {type === 'loading-fail' && (
        <div className="flex items-center gap-1.5 pointer-events-none">
          <TriangleWarning
            width={18}
            height={18}
            className="pointer-events-none"
          />
          <p className="text-sm pointer-events-none">
            File errored out while loading
          </p>
        </div>
      )}
      {type === 'unknown-attachment' && (
        <div className="flex items-center gap-1.5">
          <Paperclip width={18} height={18} className="pointer-events-none" />
          <p className="text-sm pointer-events-none">Unknown attachment</p>
        </div>
      )}
      <p className="text-xs pointer-events-none whitespace-nowrap overflow-hidden text-ellipsis">
        {src}
      </p>
    </div>
  );
}
