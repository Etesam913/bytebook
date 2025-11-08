import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { type MotionValue } from 'motion/react';
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
import { XResize } from '../../icons/arrows-expand-x';
import { Link } from '../../icons/link';
import { Trash } from '../../icons/trash';
import type { ResizeWidth } from '../../types';
import { removeDecoratorNode } from '../../utils/commands';
import { FILE_SERVER_URL } from '../../utils/general';
import { FilePath } from '../../utils/string-formatting';
import { navigate } from 'wouter/use-browser-location';
import { Browser } from '@wailsio/runtime';
import { cn } from '../../utils/string-formatting';

export function ResizeControlsPopover({
  nodeKey,
  motionValues,
  writeWidthToNode,
  src,
  isSelected,
  referenceElement,
}: {
  nodeKey: string;
  motionValues: {
    widthMotionValue: MotionValue<number | '100%'>;
    resizeHeightMotionValue: MotionValue<number | '100%'>;
    resizeWidthMotionValue: MotionValue<number | '100%'>;
  };
  writeWidthToNode: (width: ResizeWidth) => void;
  src: string;
  isSelected: boolean;
  referenceElement: RefObject<HTMLElement | null>;
}) {
  const [editor] = useLexicalComposerContext();
  const { widthMotionValue, resizeWidthMotionValue, resizeHeightMotionValue } =
    motionValues;

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
                aria-label="Full width"
                className="will-change-transform transition-transform hover:scale-[1.115] active:scale-[0.95] focus:scale-[1.115]"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  widthMotionValue.set('100%');
                  resizeWidthMotionValue.set('100%');
                  resizeHeightMotionValue.set('100%');
                  writeWidthToNode('100%');
                  e.stopPropagation();
                }}
              >
                <XResize className="will-change-transform" />
              </button>

              <button
                type="button"
                aria-label="Open link"
                className="will-change-transform transition-transform hover:scale-[1.115] active:scale-[0.95] focus:scale-[1.115]"
                onClick={() => {
                  if (!src) return;
                  if (src.startsWith(FILE_SERVER_URL)) {
                    const segments = src.split('/');
                    if (segments.length < 2) {
                      return;
                    }
                    const folderName = segments[segments.length - 2];
                    const fileName = segments[segments.length - 1];
                    const filePath = new FilePath({
                      folder: folderName,
                      note: fileName,
                    });
                    navigate(filePath.getLinkToNote());
                  } else {
                    Browser.OpenURL(src);
                  }
                }}
              >
                <Link title="Open Link" className="will-change-transform" />
              </button>
            </div>
          </div>
        </div>
      )}
    </FloatingPortal>
  );
}
