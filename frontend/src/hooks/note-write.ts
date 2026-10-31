import { type Dispatch, type SetStateAction } from 'react';
import { useStore } from 'jotai/react';
import { type LexicalEditor } from 'lexical';
import { previousMarkdownAtom } from '@components/editor/atoms';
import { CUSTOM_TRANSFORMERS } from '@components/editor/transformers';
import { useWailsEvent } from './events';
import { FILE_WRITE } from '@bindings/util/event-names';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { parseFrontMatter } from '@components/editor/utils/note-metadata';
import type { Frontmatter } from '@/types';
import { createFilePath, type FilePath } from '@utils/path';

/*
 * Hook to handle the "file:write" event from the file watcher.
 * Updates the note content in the editor when the note is changed from another window or from the file system.
 */
export function useNoteWriteEvent({
  filePath,
  editor,
  setFrontmatter,
}: {
  filePath: FilePath;
  editor: LexicalEditor;
  setFrontmatter: Dispatch<SetStateAction<Frontmatter>>;
}) {
  const store = useStore();

  useWailsEvent(FILE_WRITE, (event) => {
    for (const { filePath: eventPath, markdown } of event.data) {
      const path = createFilePath(eventPath);
      if (
        !path ||
        path.fullPath !== filePath.fullPath ||
        path.extension !== 'md' ||
        typeof markdown !== 'string'
      ) {
        continue;
      }

      // Skip save echoes without resetting selection or newer unsaved typing.
      if (markdown === store.get(previousMarkdownAtom)) continue;
      const { content, frontMatter } = parseFrontMatter(markdown);
      editor.update(
        () => {
          $convertFromMarkdownString(
            content,
            CUSTOM_TRANSFORMERS,
            undefined,
            true,
            false
          );
        },
        { tag: 'note:write-from-external' }
      );
      // Future saves must use the external metadata as their baseline too.
      store.set(previousMarkdownAtom, markdown);
      setFrontmatter(frontMatter);
    }
  });
}
