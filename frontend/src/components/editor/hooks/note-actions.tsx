import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAtomValue } from 'jotai';
import type { Key } from 'react-aria-components';
import { projectSettingsAtom } from '@/atoms';
import {
  useMoveToTrashMutation,
  useOpenInNewWindowMutation,
  usePinPathMutation,
  useRevealInFinderMutation,
} from '@hooks/notes';
import { useOpenEditTagsDialog } from '@hooks/dialogs';
import { createFilePath } from '@utils/path';
import { isTableOfContentsVisible } from '@utils/project-settings';
import type { Frontmatter } from '@/types';
import { SAVE_MARKDOWN_CONTENT } from '../plugins/save';

// Keep note menu and palette actions on the same persistence and dialog paths.
export function useNoteActions({
  folder,
  note,
  frontmatter,
}: {
  folder: string;
  note: string;
  frontmatter: Frontmatter;
}) {
  const projectSettings = useAtomValue(projectSettingsAtom);
  const filePath = createFilePath(`${folder}/${note}.md`);
  const isPinned =
    !!filePath && projectSettings.pinnedNotes.has(filePath.fullPath);
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
    if (!filePath) return;
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
