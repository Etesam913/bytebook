import { useSetAtom } from 'jotai';
import { isFileMaximizedAtom } from '../../../atoms';
import { useWailsEvent, type WailsEvent } from '../../../hooks/events';
import { isEventInCurrentWindow, TOGGLE_SIDEBAR } from '../../../utils/events';
import { LegacyAnimationControls } from 'motion';
import { easingFunctions } from '../../../animations';
import { logger } from '../../../utils/logging';

/**
 * Hook that listens for the "sidebar:toggle" event and toggles the isFileMaximizedAtom.
 * When the sidebar is hidden (isFileMaximized = true), the file takes up the full width.
 */
export function useToggleSidebarEvent(
  animationControls: LegacyAnimationControls
): void {
  const setIsFileMaximized = useSetAtom(isFileMaximizedAtom);

  useWailsEvent(TOGGLE_SIDEBAR, (data: WailsEvent) => {
    void (async () => {
      if (!(await isEventInCurrentWindow(data))) return;
      logger.event('sidebar:toggle');
      setIsFileMaximized((prev) => {
        void animationControls.start({
          x: prev ? [-40, 0] : [50, 0],
          transition: { ease: easingFunctions['ease-out-quint'] },
        });

        return !prev;
      });
    })();
  });
}
