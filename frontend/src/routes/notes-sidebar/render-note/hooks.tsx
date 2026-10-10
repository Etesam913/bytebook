import { useSetAtom } from 'jotai';
import { isFileMaximizedAtom } from '@/atoms';
import { useCurrentWindowWailsEvent } from '@hooks/events';
import { TOGGLE_SIDEBAR } from '@bindings/util/event-names';
import { LegacyAnimationControls } from 'motion';
import { easingFunctions } from '@/animations';
import { logger } from '@utils/logging';
import { createLeadingThrottle } from '@utils/timing';

const throttleSidebarToggle = createLeadingThrottle(250);

/**
 * Hook that listens for the "sidebar:toggle" event and toggles the isFileMaximizedAtom.
 * When the sidebar is hidden (isFileMaximized = true), the file takes up the full width.
 */
export function useToggleSidebarEvent(
  animationControls: LegacyAnimationControls
): void {
  const setIsFileMaximized = useSetAtom(isFileMaximizedAtom);

  useCurrentWindowWailsEvent(TOGGLE_SIDEBAR, () => {
    if (!throttleSidebarToggle('sidebar')) return;
    logger.event(TOGGLE_SIDEBAR);
    setIsFileMaximized((prev) => {
      void animationControls.start({
        x: prev ? [-40, 0] : [50, 0],
        transition: { ease: easingFunctions['ease-out-quint'] },
      });

      return !prev;
    });
  });
}
