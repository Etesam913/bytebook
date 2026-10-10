import { useLayoutEffect, useState } from 'react';
import { createDebounced, type Debounced } from '@utils/timing';

/**
 * Debounce scoped to the calling component. The returned function is stable across
 * renders, so a pending call is always cancelable, and it always runs the latest `fn`.
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  ms: number
): Debounced<TArgs> {
  const [debounced] = useState(() => createDebounced(fn, ms));
  useLayoutEffect(() => {
    debounced.setFn(fn);
  }, [debounced, fn]);
  return debounced;
}
