import { useEffect } from 'react';
import type { Debounced } from '@utils/timing';
import type { noteHandleChange } from '../utils/note-commands';
import { useWailsEvent } from '@hooks/events';
import { FILE_DELETE, FOLDER_DELETE } from '@bindings/util/event-names';
import { stripTrailingSlash, type FilePath } from '@utils/path';

/**
 * Saves a pending autosave when the note changes or unmounts, so the last edits aren't dropped.
 * Rendered after the rich-text subtree so code-block flushes run before this one.
 */
export function AutosaveFlush({
  autosave,
  filePath,
}: {
  autosave: Debounced<Parameters<typeof noteHandleChange>>;
  filePath: FilePath;
}) {
  // Deletion navigates away too, but flushing that edit would recreate the file.
  useWailsEvent(FILE_DELETE, ({ data }) => {
    if (data.some((item) => item.filePath === filePath.fullPath)) {
      autosave.cancel();
    }
  });
  useWailsEvent(FOLDER_DELETE, ({ data }) => {
    if (
      data.some((item) =>
        filePath.fullPath.startsWith(`${stripTrailingSlash(item.folderPath)}/`)
      )
    ) {
      autosave.cancel();
    }
  });

  useEffect(() => {
    return () => autosave.flush();
  }, [autosave]);
  return null;
}
