import { useEffect } from 'react';
import type { Debounced } from '@hooks/debounce';
import type { noteHandleChange } from '../utils/note-commands';

/**
 * Saves a pending autosave when the note changes or unmounts, so the last edits aren't dropped.
 * Rendered after the rich-text subtree so code-block flushes run before this one.
 */
export function AutosaveFlush({
  autosave,
}: {
  autosave: Debounced<Parameters<typeof noteHandleChange>>;
}) {
  useEffect(() => {
    return () => autosave.flush();
  }, [autosave]);
  return null;
}
