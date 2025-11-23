import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { MouseEvent, RefObject } from 'react';
import { useEffect } from 'react';
import {
  autoUpdate,
  offset,
  flip,
  shift,
  useFloating,
  useInteractions,
  FloatingPortal,
  type Placement,
} from '@floating-ui/react';
import { Link } from '../../icons/link';
import { Trash } from '../../icons/trash';
import { Browser } from '@wailsio/runtime';
import { removeDecoratorNode } from '../../utils/commands';
import { Path } from '../../utils/path';
import { navigate } from 'wouter/use-browser-location';
import { cn } from '../../utils/string-formatting';

export function ResizeControlsPopover({
  nodeKey,
  path,
  isSelected,
  referenceElement,
}: {
  nodeKey: string;
  path: Path;
  isSelected: boolean;
  referenceElement: RefObject<HTMLElement | null>;
}) {
  const [editor] = useLexicalComposerContext();

  const { refs, floatingStyles } = useFloating({
    open: isSelected,
    placement: 'top' as Placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(-12), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  const { getFloatingProps } = useInteractions([]);

  // Set the reference element
  useEffect(() => {
    if (isSelected && referenceElement.current) {
      refs.setReference(referenceElement.current);
    }
  }, [isSelected, referenceElement, refs]);

  function setFloatingRef(node: HTMLElement | null) {
    refs.setFloating(node);
  }

  return (
    <FloatingPortal>
      {isSelected && (
        <div
          ref={setFloatingRef}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-1000 pointer-events-auto"
        >
          <div>
            <div
              className={cn(
                'text-black dark:text-white bg-zinc-50 dark:bg-zinc-700 p-2 rounded-md shadow-lg border border-zinc-300 dark:border-zinc-600 flex items-center justify-center gap-3'
              )}
              onClick={(e: MouseEvent) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Delete component"
                className="will-change-transform transition-transform hover:scale-[1.115] active:scale-[0.95] focus:scale-[1.115]"
                onClick={() => {
                  if (!nodeKey) {
                    throw new Error(
                      'Node key is not provided for the trash button'
                    );
                  }
                  editor.update(() => {
                    removeDecoratorNode(nodeKey);
                  });
                }}
              >
                <Trash className="will-change-transform" />
              </button>

              <button
                type="button"
                aria-label="Open link"
                className="will-change-transform transition-transform hover:scale-[1.115] active:scale-[0.95] focus:scale-[1.115]"
                onClick={() => {
                  if (Path.isLocalFilePath(path)) {
                    navigate(path.getLinkToNote());
                  } else {
                    Browser.OpenURL(path.getFileUrl());
                  }
                }}
              >
                <Link className="will-change-transform" />
              </button>
            </div>
          </div>
        </div>
      )}
    </FloatingPortal>
  );
}
