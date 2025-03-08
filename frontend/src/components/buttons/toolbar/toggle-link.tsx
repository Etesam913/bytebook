import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { getDefaultButtonVariants } from '../../../animations';
import { Link } from '../../../icons/link';
import type { FloatingDataType } from '../../../types';

export function ToggleLinkButton({
  disabled,
  setFloatingData,
  noteContainerRef,
}: {
  disabled: boolean;
  setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
  noteContainerRef: React.RefObject<HTMLDivElement>;
}) {
  const [editor] = useLexicalComposerContext();

  return (
    <button
      className="p-1.5"
      {...getDefaultButtonVariants(disabled)}
      disabled={disabled}
      type="button"
      onClick={() => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const nativeSelection = window.getSelection()?.getRangeAt(0);
            const selectionText = selection.getTextContent().trim();
            if (selectionText.length === 0) {
              toast.error('You must select some text to create a link.', {
                position: 'top-right',
                duration: 3000,
              });
              return;
            }
            const domRect = nativeSelection?.getBoundingClientRect();
            if (domRect) {
              const { top, left } = domRect;
              const noteContainerBounds =
                noteContainerRef.current?.getBoundingClientRect();
              setFloatingData({
                isOpen: true,
                top:
                  top -
                  (noteContainerBounds ? noteContainerBounds.top : 0) -
                  80,
                left:
                  left - (noteContainerBounds ? noteContainerBounds.left : 0),
                type: 'link',
              });
            }
          }
        });
      }}
    >
      <Link className="will-change-transform" />
    </button>
  );
}
