import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { AnimatePresence } from 'motion/react';
import { useRef } from 'react';
import { Paperclip } from '../../icons/paperclip-2';
import { TriangleWarning } from '../../icons/triangle-warning';
import { cn } from '../../utils/string-formatting';
import { Path } from '../../utils/path';
import { NoteComponentControls } from '../note-component-container/component-controls';
import { ResizeControlsPopover } from '../resize-container/resize-controls-popover';
import { SelectionHighlight } from '../selection-highlight';

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
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      data-node-key={nodeKey}
      data-interactable="true"
      className={cn(
        'max-w-80 inline-block relative bg-zinc-50 text-zinc-600 dark:text-zinc-300 dark:bg-zinc-700 px-2 py-1 mx-1 border-3 border-solid border-zinc-200 dark:border-zinc-650 space-y-1.5',
        isSelected && 'border-(--accent-color)!'
      )}
    >
      <ResizeControlsPopover
        nodeKey={nodeKey}
        path={path}
        isSelected={isSelected}
        referenceElement={containerRef}
      />
      <AnimatePresence>
        {isSelected && (
          <>
            <SelectionHighlight />
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
          </>
        )}
      </AnimatePresence>
      {type === 'loading-fail' && (
        <div className="flex items-center gap-1.5">
          <TriangleWarning width={18} height={18} />
          <p className="text-sm">File errored out while loading</p>
        </div>
      )}
      {type === 'unknown-attachment' && (
        <div className="flex items-center gap-1.5">
          <Paperclip width={18} height={18} />
          <p className="text-sm">Unknown attachment</p>
        </div>
      )}
      <p className="text-xs whitespace-nowrap overflow-hidden text-ellipsis">
        {src}
      </p>
    </div>
  );
}
