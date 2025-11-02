import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAtomValue } from 'jotai/react';
import { type RefObject, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { projectSettingsAtom } from '../../../atoms';
import type { Dispatch, SetStateAction } from 'react';
import type { PlaceholderLineData } from '../types';

/**
 * Plugin that shows a placeholder hint when the user is on an empty line
 * with an empty range selection.
 */
export function EmptyLinePlaceholderPlugin({
  noteContainerRef,
  placeholderLineData,
  setPlaceholderLineData,
}: {
  noteContainerRef: RefObject<HTMLDivElement | null>;
  placeholderLineData: PlaceholderLineData;
  setPlaceholderLineData: Dispatch<SetStateAction<PlaceholderLineData>>;
}) {
  const [editor] = useLexicalComposerContext();
  const projectSettings = useAtomValue(projectSettingsAtom);

  // Function to update the placeholder position
  const updatePlaceholderPosition = useCallback(
    (parentKey?: string | null) => {
      const keyToUse = parentKey ?? placeholderLineData.parentKey;
      if (!keyToUse || !noteContainerRef.current) {
        return;
      }

      const parentDOM = editor.getElementByKey(keyToUse);
      if (!parentDOM) {
        setPlaceholderLineData((prev) => ({ ...prev, show: false }));
        return;
      }

      // Get the bounding rect of the parent element and the container
      const rect = parentDOM.getBoundingClientRect();
      const containerRect = noteContainerRef.current.getBoundingClientRect();

      // Calculate position relative to the container
      setPlaceholderLineData((prev) => ({
        ...prev,
        position: {
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
        },
      }));
    },
    [
      editor,
      noteContainerRef,
      placeholderLineData.parentKey,
      setPlaceholderLineData,
    ]
  );

  // Watch for layout changes in the note container
  // Mainly handles the case where the table of contents being shown causes the placeholder
  // line to intersect with the table of contents.
  useEffect(() => {
    if (!noteContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updatePlaceholderPosition();
    });

    resizeObserver.observe(noteContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updatePlaceholderPosition]);

  if (
    !placeholderLineData.show ||
    !noteContainerRef.current ||
    !(projectSettings.appearance.showEmptyLinePlaceholder ?? true)
  ) {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none select-none text-zinc-400 dark:text-zinc-500"
      style={{
        position: 'absolute',
        top: `${placeholderLineData.position.top + 2}px`,
        left: `${placeholderLineData.position.left + 3.5}px`,
        whiteSpace: 'nowrap',
        fontSize: '1rem',
        lineHeight: '1.5rem',
        fontFamily: `"${projectSettings.appearance.editorFontFamily}", "Bricolage Grotesque"`,
      }}
    >
      Type "/" to insert an element or "@" to add a linked note
    </div>,
    noteContainerRef.current
  );
}
