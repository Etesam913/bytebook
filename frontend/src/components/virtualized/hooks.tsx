import { type AnimationScope, useAnimate } from 'motion/react';
import { useState, useEffect, useRef } from 'react';

const SPRING_ANIMATION = {
  type: 'spring',
  damping: 17,
  stiffness: 115,
} as const;

const INSTANT_ANIMATION = { duration: 0 } as const;

type HeightValue = string | number | 'auto';

/** Calculates the target height based on list state */
function getTargetHeight({
  totalHeight,
  maxHeight,
}: {
  totalHeight: number | null;
  maxHeight?: string;
}): HeightValue {
  if (maxHeight) {
    return `min(${totalHeight}px, ${maxHeight})`;
  }
  return totalHeight ?? 0;
}

/** Applies the appropriate animation based on current state */
function applyAnimation({
  scope,
  animate,
  height,
  opacity,
  shouldAnimate,
}: {
  scope: AnimationScope<HTMLDivElement>;
  animate: ReturnType<typeof useAnimate>[1];
  height: HeightValue;
  opacity: number;
  shouldAnimate: boolean;
}) {
  const animationConfig = shouldAnimate ? SPRING_ANIMATION : INSTANT_ANIMATION;
  animate(scope.current, { height, opacity }, animationConfig);
}

/**
 * A hook that manages the animated height of a list, typically used with virtualized lists
 * or accordions to provide smooth opening and closing transitions.
 */
export function useAnimatedHeight({
  isOpen,
  maxHeight,
  onTotalListHeightChanged,
  emptyHeight,
  isEmpty,
}: {
  isOpen: boolean;
  maxHeight?: string;
  onTotalListHeightChanged?: (height: number) => void;
  /** Height to use when the list is empty. Defaults to 'auto' if not provided. */
  emptyHeight?: string;
  /** Whether the list is empty. When true, uses 'auto' height for the empty element. */
  isEmpty?: boolean;
}) {
  // null = not yet measured, number = measured (including 0 for empty lists)
  const [totalHeight, setTotalHeight] = useState<number | null>(null);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const hasMeasured = useRef(false);
  const prevIsOpen = useRef(isOpen);

  // When empty, we're ready immediately since we don't need to wait for Virtuoso measurement
  const isReady = isEmpty || totalHeight !== null;

  useEffect(() => {
    // Handle empty state: use 'auto' height to size naturally to the empty element
    if (isEmpty) {
      const targetHeight = isOpen ? (emptyHeight ?? 'auto') : 0;
      const targetOpacity = isOpen ? 1 : 0;
      const isOpenChanged = prevIsOpen.current !== isOpen;

      if (!hasMeasured.current) {
        applyAnimation({
          scope,
          animate,
          height: targetHeight,
          opacity: targetOpacity,
          shouldAnimate: false,
        });
        hasMeasured.current = true;
      } else {
        applyAnimation({
          scope,
          animate,
          height: targetHeight,
          opacity: targetOpacity,
          shouldAnimate: isOpenChanged,
        });
      }

      prevIsOpen.current = isOpen;
      return;
    }

    // If the list has items but hasn't been measured yet, wait for measurement
    if (totalHeight === null) {
      if (isOpen && scope.current) {
        // Set a temporary height so Virtuoso can measure
        animate(
          scope.current,
          { height: maxHeight || '100%', opacity: 1 },
          INSTANT_ANIMATION
        );
      } else {
        animate(scope.current, { height: 0, opacity: 0 }, INSTANT_ANIMATION);
        hasMeasured.current = true;
      }
      return;
    }

    const targetHeight = getTargetHeight({
      totalHeight,
      maxHeight,
    });
    const targetOpacity = isOpen ? 1 : 0;
    const isOpenChanged = prevIsOpen.current !== isOpen;

    if (!hasMeasured.current) {
      // FIRST LOAD: snap instantly without animation
      const height = isOpen ? targetHeight : 0;
      applyAnimation({
        scope,
        animate,
        height,
        opacity: targetOpacity,
        shouldAnimate: false,
      });
      hasMeasured.current = true;
    } else {
      // SUBSEQUENT UPDATES: animate only when accordion opens/closes
      const height = isOpen ? targetHeight : 0;
      applyAnimation({
        scope,
        animate,
        height,
        opacity: targetOpacity,
        shouldAnimate: isOpenChanged,
      });
    }

    prevIsOpen.current = isOpen;
  }, [totalHeight, isOpen, maxHeight, animate, scope, emptyHeight, isEmpty]);

  const handleHeightChange = (height: number) => {
    setTotalHeight(height);
    onTotalListHeightChanged?.(height);
  };

  return {
    scope,
    isReady,
    handleHeightChange,
    totalHeight,
  };
}
