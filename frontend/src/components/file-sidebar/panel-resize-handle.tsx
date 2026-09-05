import { type RefObject, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useMove } from 'react-aria';
import {
  fileSidebarOpenStateAtom,
  MIN_FLEX_WEIGHT,
  type SidebarFlexWeights,
  type SidebarPanelKey,
} from '@/atoms';
import { cn } from '@utils/string-formatting';
import type { FlexWeightMVs } from './index';

const KEYBOARD_STEP = 8;

export function PanelResizeHandle({
  panelKey,
  containerRef,
  flexWeightMVs,
  storedWeightsRef,
  visibleOrder,
}: {
  panelKey: SidebarPanelKey;
  visibleOrder: SidebarPanelKey[];
  containerRef: RefObject<HTMLElement | null>;
  flexWeightMVs: FlexWeightMVs;
  storedWeightsRef: RefObject<SidebarFlexWeights>;
}) {
  const openState = useAtomValue(fileSidebarOpenStateAtom);
  const [isDragging, setIsDragging] = useState(false);
  // Captured at move start so each delta is applied against the same baseline.
  const moveStateRef = useRef<{
    aboveKey: SidebarPanelKey;
    aboveWeight: number;
    currentWeight: number;
    pairWeight: number;
    pairDistributable: number;
    totalDeltaY: number;
  } | null>(null);

  const currentIndex = visibleOrder.indexOf(panelKey);
  const abovePanelKey = visibleOrder
    .slice(0, currentIndex)
    .reverse()
    .find((key) => openState[key]);
  const canResize = abovePanelKey !== undefined && openState[panelKey];

  const startMove = () => {
    if (!canResize || !abovePanelKey || !containerRef.current) return;

    const aboveMV = flexWeightMVs[abovePanelKey];
    const currentMV = flexWeightMVs[panelKey];

    // Interrupt any in-flight open/close animations and reset velocity
    aboveMV.jump(aboveMV.get());
    currentMV.jump(currentMV.get());

    setIsDragging(true);
    document.body.classList.add('bb-force-row-resize');

    const pairWeight = aboveMV.get() + currentMV.get();

    // Compute distributable space between the two panels being resized.
    // Each panel section has: resize handle (0px) + trigger button (fixed) + content (flexible).
    // We measure the content portions to get 1:1 cursor tracking.
    const aboveIndex = visibleOrder.indexOf(abovePanelKey);
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

    moveStateRef.current = {
      aboveKey: abovePanelKey,
      aboveWeight: aboveMV.get(),
      currentWeight: currentMV.get(),
      pairWeight,
      pairDistributable,
      totalDeltaY: 0,
    };
  };

  const { moveProps } = useMove({
    onMoveStart: startMove,
    onMove: (e) => {
      const state = moveStateRef.current;
      if (!state) return;

      state.totalDeltaY +=
        e.pointerType === 'keyboard'
          ? Math.sign(e.deltaY) * KEYBOARD_STEP
          : e.deltaY;
      const weightDelta =
        (state.totalDeltaY / state.pairDistributable) * state.pairWeight;

      let newAboveWeight = state.aboveWeight + weightDelta;
      let newCurrentWeight = state.currentWeight - weightDelta;

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
      flexWeightMVs[state.aboveKey].set(newAboveWeight);
      flexWeightMVs[panelKey].set(newCurrentWeight);

      // Keep stored weights in sync
      storedWeightsRef.current[state.aboveKey] = newAboveWeight;
      storedWeightsRef.current[panelKey] = newCurrentWeight;
    },
    onMoveEnd: () => {
      if (!moveStateRef.current) return;
      setIsDragging(false);
      document.body.classList.remove('bb-force-row-resize');
      moveStateRef.current = null;

      // Persist to localStorage on drag end only
      localStorage.setItem(
        'sidebarFlexWeights',
        JSON.stringify(storedWeightsRef.current)
      );
    },
  });

  return (
    <div
      {...(canResize ? moveProps : {})}
      role="separator"
      aria-orientation="horizontal"
      aria-label={`Resize ${panelKey} panel`}
      tabIndex={canResize ? 0 : -1}
      className={cn(
        'h-4 -my-2 w-full relative z-10 shrink-0 outline-none focus-visible:before:bg-(--accent-color)',
        canResize &&
          (isDragging
            ? 'before:absolute before:inset-x-0 before:top-1/2 before:-translate-y-1/2 before:h-[3px] before:bg-(--accent-color)'
            : 'before:absolute before:inset-x-0 before:top-1/2 before:-translate-y-1/2 before:h-[3px] before:bg-transparent hover:before:bg-(--accent-color) hover:cursor-row-resize')
      )}
    />
  );
}
