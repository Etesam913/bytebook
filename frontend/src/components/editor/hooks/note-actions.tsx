import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAtomValue, useSetAtom } from 'jotai';
import type { Key } from 'react-aria-components';
import { dialogDataAtom, projectSettingsAtom } from '@/atoms';
import {
  useMoveToTrashMutation,
  useOpenInNewWindowMutation,
  useRevealInFinderMutation,
} from '@hooks/notes';
import { createFilePath } from '@utils/path';
import { isTableOfContentsVisible } from '@utils/project-settings';
import { useEditTagsFormMutation } from '@hooks/tags';
import { useUpdateProjectSettingsMutation } from '@hooks/project-settings';
import { EditTagDialogChildren } from '@/routes/notes-sidebar/edit-tag-dialog-children';
import type { Frontmatter, ProjectSettings } from '@/types';
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
  const setDialogData = useSetAtom(dialogDataAtom);
  const [editor] = useLexicalComposerContext();

  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutation();
  const { mutate: openInNewWindow } = useOpenInNewWindowMutation();
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { mutateAsync: editTags } = useEditTagsFormMutation();

  const isTocVisible = isTableOfContentsVisible({
    frontmatter,
    projectSettings,
  });

  function handleAction(key: Key) {
    if (!filePath) return;
    switch (key) {
      case 'pin-note':
      case 'unpin-note': {
        const newPinnedNotes = new Set(projectSettings.pinnedNotes);
        if (key === 'pin-note') {
          newPinnedNotes.add(filePath.fullPath);
        } else {
          newPinnedNotes.delete(filePath.fullPath);
        }
        const newProjectSettings: ProjectSettings = {
          ...projectSettings,
          pinnedNotes: newPinnedNotes,
        };
        updateProjectSettings({
          newProjectSettings,
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
        const filePaths = [filePath.fullPath];
        setDialogData({
          isOpen: true,
          isPending: false,
          title: 'Edit Tags',
          dialogClassName: 'w-[min(30rem,90vw)]',
          children: (errorText) => (
            <EditTagDialogChildren
              filePaths={filePaths}
              errorText={errorText}
            />
          ),
          onSubmit: async (formData, setErrorText) => {
            try {
              return await editTags({
                formData,
                setErrorText,
                filePaths,
              });
            } catch {
              // onError fills in the dialog's error text; keep it open.
              return false;
            }
          },
        });
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
