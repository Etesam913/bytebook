import { type RefObject, useEffect, useState } from 'react';
import { useInteractOutside } from 'react-aria';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debouncedValue;
}

/** Fires when a pointer interaction completes outside `ref`. Presses that start inside are ignored. */
export function useOnInteractOutside(
  ref: RefObject<HTMLElement | null>,
  handler: (event: PointerEvent) => void,
  isDisabled = false
): void {
  useInteractOutside({ ref, onInteractOutside: handler, isDisabled });
}
