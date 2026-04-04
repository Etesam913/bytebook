import { type RefObject, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  fileSidebarOpenStateAtom,
  MIN_FLEX_WEIGHT,
  SIDEBAR_PANEL_KEYS,
  type SidebarFlexWeights,
  type SidebarPanelKey,
} from '../../atoms';
import { dragItem } from '../../utils/draggable';
import { cn } from '../../utils/string-formatting';
import type { FlexWeightMVs } from './index';

/**
 * Returns the current index of the panelKey and the nearest open panel key above it.
 */
function getPanelKeyLocation(
  panelKey: SidebarPanelKey,
  openState: Record<SidebarPanelKey, boolean>
): { currentIndex: number; abovePanelKey: SidebarPanelKey | null } {
  const currentIndex = SIDEBAR_PANEL_KEYS.indexOf(panelKey);
  let abovePanelKey: SidebarPanelKey | null = null;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const key = SIDEBAR_PANEL_KEYS[i];
    if (openState[key]) {
      abovePanelKey = key;
      break;
    }
  }
  return { currentIndex, abovePanelKey };
}

export function PanelResizeHandle({
  panelKey,
  containerRef,
  flexWeightMVs,
  storedWeightsRef,
}: {
  panelKey: SidebarPanelKey;
  containerRef: RefObject<HTMLElement | null>;
  flexWeightMVs: FlexWeightMVs;
  storedWeightsRef: RefObject<SidebarFlexWeights>;
}) {
  const openState = useAtomValue(fileSidebarOpenStateAtom);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartClientYRef = useRef<number | null>(null);
  const dragStartWeightsRef = useRef<{
    aboveKey: SidebarPanelKey;
    aboveWeight: number;
    currentWeight: number;
  } | null>(null);

  const { currentIndex, abovePanelKey } = getPanelKeyLocation(
    panelKey,
    openState
  );
  const canResize = abovePanelKey !== null && openState[panelKey];

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canResize || !abovePanelKey || !containerRef.current) return;

    const aboveMV = flexWeightMVs[abovePanelKey];
    const currentMV = flexWeightMVs[panelKey];

    // Interrupt any in-flight open/close animations and reset velocity
    aboveMV.jump(aboveMV.get());
    currentMV.jump(currentMV.get());

    dragStartClientYRef.current = e.clientY;
    dragStartWeightsRef.current = {
      aboveKey: abovePanelKey,
      aboveWeight: aboveMV.get(),
      currentWeight: currentMV.get(),
    };

    setIsDragging(true);
    document.body.classList.add('bb-force-row-resize');

    const capturedAboveKey = abovePanelKey;
    const pairWeight = aboveMV.get() + currentMV.get();

    // Compute distributable space between the two panels being resized.
    // Each panel section has: resize handle (0px) + trigger button (fixed) + content (flexible).
    // We measure the content portions to get 1:1 cursor tracking.
    const aboveIndex = SIDEBAR_PANEL_KEYS.indexOf(abovePanelKey);
    const sectionEls = containerRef.current.children;
    const aboveEl = sectionEls[aboveIndex] as HTMLElement | undefined;
    const currentEl = sectionEls[currentIndex] as HTMLElement | undefined;

    let pairDistributable = 0;
    if (aboveEl && currentEl) {
      // The trigger is child[1] (after the resize handle at child[0])
      const aboveTriggerH =
        (aboveEl.children[1] as HTMLElement | undefined)?.offsetHeight ?? 0;
      const currentTriggerH =
        (currentEl.children[1] as HTMLElement | undefined)?.offsetHeight ?? 0;
      pairDistributable =
        aboveEl.clientHeight -
        aboveTriggerH +
        (currentEl.clientHeight - currentTriggerH);
    }

    // Fallback: use container height if measurement failed
    if (pairDistributable < 1) {
      pairDistributable = containerRef.current.clientHeight;
    }

    dragItem(
      (dragEvent: MouseEvent) => {
        const startY = dragStartClientYRef.current;
        const startWeights = dragStartWeightsRef.current;
        if (startY === null || !startWeights) return;

        const deltaY = dragEvent.clientY - startY;
        const weightDelta = (deltaY / pairDistributable) * pairWeight;

        let newAboveWeight = startWeights.aboveWeight + weightDelta;
        let newCurrentWeight = startWeights.currentWeight - weightDelta;

        // Clamp both to minimum
        if (newAboveWeight < MIN_FLEX_WEIGHT) {
          const diff = MIN_FLEX_WEIGHT - newAboveWeight;
          newAboveWeight = MIN_FLEX_WEIGHT;
          newCurrentWeight -= diff;
        }
        if (newCurrentWeight < MIN_FLEX_WEIGHT) {
          const diff = MIN_FLEX_WEIGHT - newCurrentWeight;
          newCurrentWeight = MIN_FLEX_WEIGHT;
          newAboveWeight -= diff;
        }

        // Direct DOM update — zero React re-renders
        flexWeightMVs[capturedAboveKey].set(newAboveWeight);
        flexWeightMVs[panelKey].set(newCurrentWeight);

        // Keep stored weights in sync
        storedWeightsRef.current[capturedAboveKey] = newAboveWeight;
        storedWeightsRef.current[panelKey] = newCurrentWeight;
      },
      () => {
        setIsDragging(false);
        document.body.classList.remove('bb-force-row-resize');
        dragStartClientYRef.current = null;
        dragStartWeightsRef.current = null;

        // Persist to localStorage on drag end only
        localStorage.setItem(
          'sidebarFlexWeights',
          JSON.stringify(storedWeightsRef.current)
        );
      }
    );
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'h-4 -my-2 w-full relative z-10 shrink-0',
        canResize &&
          (isDragging
            ? 'before:absolute before:inset-x-0 before:top-1/2 before:-translate-y-1/2 before:h-[3px] before:bg-(--accent-color)'
            : 'before:absolute before:inset-x-0 before:top-1/2 before:-translate-y-1/2 before:h-[3px] before:bg-transparent hover:before:bg-(--accent-color) hover:cursor-row-resize')
      )}
    />
  );
}
