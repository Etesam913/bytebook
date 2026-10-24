import { useProjectSettingsQuery } from '@hooks/project-settings';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { Key } from 'react-aria-components';
import {
  useMoveToTrashMutation,
  useOpenInNewWindowMutation,
  usePinPathMutation,
  useRevealInFinderMutation,
} from '@hooks/notes';
import { useOpenEditTagsDialog } from '@hooks/dialogs';
import type { FilePath } from '@utils/path';
import { isTableOfContentsVisible } from '@utils/project-settings';
import type { Frontmatter } from '@/types';
import { SAVE_MARKDOWN_CONTENT } from '../plugins/save';

// Keep note menu and palette actions on the same persistence and dialog paths.
export function useNoteActions({
  filePath,
  frontmatter,
}: {
  filePath: FilePath;
  frontmatter: Frontmatter;
}) {
  const projectSettings = useProjectSettingsQuery().data;
  const isPinned = projectSettings.pinnedNotes.has(filePath.fullPath);
  const [editor] = useLexicalComposerContext();

  const { mutate: pinPath } = usePinPathMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutation();
  const { mutate: openInNewWindow } = useOpenInNewWindowMutation();
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const openEditTagsDialog = useOpenEditTagsDialog();

  const isTocVisible = isTableOfContentsVisible({
    frontmatter,
    projectSettings,
  });

  function handleAction(key: Key) {
    switch (key) {
      case 'pin-note':
      case 'unpin-note': {
        pinPath({
          paths: [filePath.fullPath],
          shouldPin: key === 'pin-note',
        });
        break;
      }
      case 'show-table-of-contents':
      case 'hide-table-of-contents': {
        const copyOfFrontmatter = { ...frontmatter };
        copyOfFrontmatter.showTableOfContents =
          key === 'show-table-of-contents' ? 'true' : 'false';

        editor.update(() => {
          editor.dispatchCommand(SAVE_MARKDOWN_CONTENT, {
            newFrontmatter: copyOfFrontmatter,
          });
        });
        break;
      }
      case 'open-in-new-window': {
        openInNewWindow({ path: filePath });
        break;
      }
      case 'reveal-in-finder': {
        revealInFinder({ path: filePath });
        break;
      }
      case 'edit-tags': {
        openEditTagsDialog([filePath.fullPath]);
        break;
      }
      case 'move-to-trash': {
        moveToTrash({ paths: [filePath.fullPath] });
        break;
      }
    }
  }

  return { isPinned, isTocVisible, handleAction };
}
