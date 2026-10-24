import type { MotionValue } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { useMove } from 'react-aria';
import { noteContainerRefAtom } from '@components/editor/atoms';
import { projectSettingsAtom, projectSettingsLoadedAtom } from '@/atoms';
import { useUpdateProjectSettingsMutation } from '@hooks/project-settings';
import { MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH } from '@utils/general';
import { cn } from '@utils/string-formatting';

const KEYBOARD_STEP = 16;

function useSidebarResizePreview() {
  const noteContainerRef = useAtomValue(noteContainerRefAtom);
  const [isDragged, setIsDragged] = useState(false);

  const cleanupRef = useRef<(() => void) | null>(null);

  function finishResize() {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setIsDragged(false);
  }

  function startResize() {
    cleanupRef.current?.();
    const content =
      noteContainerRef?.current?.closest<HTMLElement>('#note-editor-pane');
    // Capture the border box before the first sidebar update, including scrollbars.
    content?.style.setProperty(
      '--sidebar-resize-content-width',
      `${content.getBoundingClientRect().width}px`
    );
    document.body.classList.add('bb-force-grabbing');
    if (content) document.body.classList.add('bb-sidebar-resizing');
    setIsDragged(true);
    window.addEventListener('blur', finishResize);

    cleanupRef.current = () => {
      window.removeEventListener('blur', finishResize);
      document.body.classList.remove(
        'bb-force-grabbing',
        'bb-sidebar-resizing'
      );
      content?.style.removeProperty('--sidebar-resize-content-width');
    };
  }

  useEffect(() => () => cleanupRef.current?.(), []);

  return { isDragged, startResize, finishResize };
}

export function Spacer({ width }: { width: MotionValue<number> }) {
  const { isDragged, startResize, finishResize } = useSidebarResizePreview();

  const projectSettings = useAtomValue(projectSettingsAtom);
  const settingsLoaded = useAtomValue(projectSettingsLoadedAtom);
  const setProjectSettings = useSetAtom(projectSettingsAtom);
  const { mutate: updateSettings } = useUpdateProjectSettingsMutation();

  function saveWidth() {
    finishResize();
    const sidebarWidth = width.get();
    if (
      !settingsLoaded ||
      sidebarWidth === projectSettings.appearance.sidebarWidth
    )
      return;
    updateSettings(
      {
        newProjectSettings: {
          ...projectSettings,
          appearance: { ...projectSettings.appearance, sidebarWidth },
        },
      },
      {
        onSuccess: () =>
          setProjectSettings((previous) => ({
            ...previous,
            appearance: { ...previous.appearance, sidebarWidth },
          })),
      }
    );
  }

  const { moveProps } = useMove({
    onMoveStart: (e) => {
      if (e.pointerType === 'keyboard') return;
      startResize();
    },
    onMove: (e) => {
      const delta =
        e.pointerType === 'keyboard'
          ? Math.sign(e.deltaX) * KEYBOARD_STEP
          : e.deltaX;
      width.set(
        Math.max(
          Math.min(width.get() + delta, MAX_SIDEBAR_WIDTH),
          MIN_SIDEBAR_WIDTH
        )
      );
    },
    onMoveEnd: saveWidth,
  });

  return (
    <div
      {...moveProps}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={MIN_SIDEBAR_WIDTH}
      aria-valuemax={MAX_SIDEBAR_WIDTH}
      tabIndex={0}
      className={cn(
        'w-1.5 shrink-0 border-l outline-none focus-visible:border-l-(--accent-color)! focus-visible:border-l-2',
        isDragged
          ? 'border-(--accent-color) border-l-3 pointer-events-none'
          : 'border-l-zinc-200 dark:border-l-zinc-700 hover:border-l-(--accent-color)! hover:border-l-2 hover:cursor-grab'
      )}
    />
  );
}
