import { useSetAtom } from 'jotai';
import { isNoteMaximizedAtom } from '../../../atoms';
import { useWailsEvent, type WailsEvent } from '../../../hooks/events';
import { isEventInCurrentWindow, TOGGLE_SIDEBAR } from '../../../utils/events';
import { LegacyAnimationControls } from 'motion';
import { easingFunctions } from '../../../animations';
import { logger } from '../../../utils/logging';

/**
 * Hook that listens for the "sidebar:toggle" event and toggles the isNoteMaximizedAtom.
 * When the sidebar is hidden (isNoteMaximized = true), the note takes up the full width.
 */
export function useToggleSidebarEvent(
  animationControls: LegacyAnimationControls
): void {
  const setIsNoteMaximized = useSetAtom(isNoteMaximizedAtom);

  useWailsEvent(TOGGLE_SIDEBAR, async (data: WailsEvent) => {
    if (!(await isEventInCurrentWindow(data))) return;
    logger.event('sidebar:toggle');
    setIsNoteMaximized((prev) => {
      animationControls.start({
        x: prev ? [-40, 0] : [50, 0],
        transition: { ease: easingFunctions['ease-out-quint'] },
      });

      return !prev;
    });
  });
}
