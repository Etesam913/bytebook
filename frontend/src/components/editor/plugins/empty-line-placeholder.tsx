import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAtomValue } from 'jotai/react';
import { type RefObject, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { projectSettingsAtom } from '../../../atoms';
import type { Dispatch, SetStateAction } from 'react';
import type { PlaceholderLineData } from '../types';
import { useRefState } from '../hooks/ref-state';

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
  const noteContainerElement = useRefState(noteContainerRef);

  function updatePlaceholderPosition(parentKey?: string | null) {
    const keyToUse = parentKey ?? placeholderLineData.parentKey;
    if (!keyToUse || !noteContainerElement) {
      return;
    }

    const parentDOM = editor.getElementByKey(keyToUse);
    if (!parentDOM) {
      setPlaceholderLineData((prev) => ({ ...prev, show: false }));
      return;
    }

    // Get the bounding rect of the parent element and the container
    const rect = parentDOM.getBoundingClientRect();
    const containerRect = noteContainerElement.getBoundingClientRect();

    // Calculate position relative to the container
    setPlaceholderLineData((prev) => ({
      ...prev,
      position: {
        top: rect.top - containerRect.top,
        left: rect.left - containerRect.left,
      },
    }));
  }

  // Watch for layout changes in the note container
  // Mainly handles the case where the table of contents being shown causes the placeholder
  // line to intersect with the table of contents.
  useEffect(() => {
    if (!noteContainerElement) return;

    const resizeObserver = new ResizeObserver(() => {
      updatePlaceholderPosition();
    });

    resizeObserver.observe(noteContainerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    noteContainerElement,
    placeholderLineData.parentKey,
    editor,
    setPlaceholderLineData,
  ]);

  if (
    !placeholderLineData.show ||
    !noteContainerElement ||
    !(projectSettings.appearance.showEmptyLinePlaceholder ?? true)
  ) {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none select-none text-zinc-400 dark:text-zinc-500 absolute whitespace-nowrap text-md "
      style={{
        position: 'absolute',
        transform: `translate(calc(${placeholderLineData.position.left + 3}px), calc(${placeholderLineData.position.top + 2}px))`,
        fontFamily: `"${projectSettings.appearance.editorFontFamily}", "Bricolage Grotesque"`,
      }}
    >
      Type &quot;/&quot; to insert an element or &quot;@&quot; to add a linked
      note
    </div>,
    noteContainerElement
  );
}
