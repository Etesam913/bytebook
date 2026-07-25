import { useEffect, useRef } from 'react';

// Restores keyboard focus to a tree row after its inline editor closes.
export function useTreeItemEditFocus(isEditing: boolean) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasEditingRef = useRef(false);

  useEffect(() => {
    if (wasEditingRef.current && !isEditing) {
      buttonRef.current?.focus();
    }
    wasEditingRef.current = isEditing;
  }, [isEditing]);

  return buttonRef;
}
