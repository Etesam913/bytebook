import { useStore } from 'jotai';
import type { LegacyAnimationControls } from 'motion';
import { isFileMaximizedAtom } from '@/atoms';
import { easingFunctions } from '@/animations';
import { TOGGLE_SIDEBAR } from '@bindings/util/event-names';
import { useCurrentWindowWailsEvent } from '@hooks/events';
import { logger } from '@utils/logging';
import { createLeadingThrottle } from '@utils/timing';

const throttleSidebarToggle = createLeadingThrottle(250);

export function toggleFileMaximized(
  store: ReturnType<typeof useStore>,
  animationControls: LegacyAnimationControls
) {
  const isMaximized = store.get(isFileMaximizedAtom);
  store.set(isFileMaximizedAtom, !isMaximized);
  void animationControls.start({
    x: isMaximized ? [-40, 0] : [50, 0],
    transition: { ease: easingFunctions['ease-out-quint'] },
  });
}

export function useToggleSidebarEvent(
  animationControls: LegacyAnimationControls
) {
  const store = useStore();
  useCurrentWindowWailsEvent(TOGGLE_SIDEBAR, () => {
    if (!throttleSidebarToggle('sidebar')) return;
    logger.event(TOGGLE_SIDEBAR);
    toggleFileMaximized(store, animationControls);
  });
}
