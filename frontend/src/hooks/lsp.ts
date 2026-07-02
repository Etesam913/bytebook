import { useEffect } from 'react';
import { NotifyNoteClosed } from '../../bindings/github.com/etesam913/bytebook/internal/services/lspservice';
import { useDecodedNotesWildcardPath } from './routes';

/**
 * Shuts down the note's LSP instance when the user navigates to a different
 * note or the editor unmounts. Each instance is a pyright child process, so
 * without this they would accumulate until app exit. Closing a note that has
 * no LSP instance is a no-op on the backend.
 */
export function useLspNoteLifecycle() {
  const noteId = useDecodedNotesWildcardPath();

  useEffect(() => {
    if (!noteId) return;
    return () => {
      void NotifyNoteClosed(noteId).catch(() => undefined);
    };
  }, [noteId]);
}
