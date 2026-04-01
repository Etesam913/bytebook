import { useSetAtom, useAtomValue } from 'jotai';
import { handleKeyNavigation } from '../../../utils/selection';
import { type FilePath } from '../../../utils/path';
import { ListNoteSidebarItem } from './list-note-sidebar-item';
import { navigate } from 'wouter/use-browser-location';
import { routeUrls } from '../../../utils/routes';
import { cn } from '../../../utils/string-formatting';
import {
  contextMenuDataAtom,
  dialogDataAtom,
  projectSettingsAtom,
} from '../../../atoms';
import {
  useMoveToTrashMutation,
  useNoteRevealInFinderMutation,
} from '../../../hooks/notes';
import { useEditTagsFormMutation } from '../../../hooks/tags';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { EditTagDialogChildren } from '../edit-tag-dialog-children';
import { Finder } from '../../../icons/finder';
import { PinTack2 } from '../../../icons/pin-tack-2';
import { TagPlus } from '../../../icons/tag-plus';
import { Trash } from '../../../icons/trash';
import type { ProjectSettings } from '../../../types';

export function NoteSidebarButton({
  searchQuery,
  sidebarNotePath,
  activeNotePath,
}: {
  searchQuery: string;
  sidebarNotePath: FilePath;
  activeNotePath: FilePath | undefined;
}) {
  const isActive = activeNotePath
    ? sidebarNotePath.equals(activeNotePath)
    : false;

  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const setDialogData = useSetAtom(dialogDataAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const isPinned = projectSettings.pinnedNotes.has(sidebarNotePath.fullPath);

  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutation();
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
  const { mutateAsync: editTags } = useEditTagsFormMutation();

  return (
    <button
      type="button"
      title={sidebarNotePath.fullPath}
      draggable={false}
      onKeyDown={(e) => handleKeyNavigation(e)}
      className={cn(
        'list-sidebar-item',
        isActive && 'bg-zinc-150! dark:bg-zinc-700!'
      )}
      onClick={() => {
        navigate(
          routeUrls.savedSearch(searchQuery, sidebarNotePath.encodedPath)
        );
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenuData({
          x: e.clientX,
          y: e.clientY,
          isShowing: true,
          items: [
            {
              value: 'reveal-in-finder',
              label: (
                <span className="flex items-center gap-1.5">
                  <Finder height="1.0625rem" width="1.0625rem" />
                  <span>Reveal In Finder</span>
                </span>
              ),
              onChange: () => {
                revealInFinder({
                  folder: sidebarNotePath.folder,
                  selectionRange: new Set([`note:${sidebarNotePath.note}`]),
                });
              },
            },
            {
              value: isPinned ? 'unpin-note' : 'pin-note',
              label: (
                <span className="flex items-center gap-1.5">
                  <PinTack2 height="1.0625rem" width="1.0625rem" />
                  <span>{isPinned ? 'Unpin Note' : 'Pin Note'}</span>
                </span>
              ),
              onChange: () => {
                const newProjectSettings: ProjectSettings = {
                  ...projectSettings,
                };
                if (isPinned) {
                  newProjectSettings.pinnedNotes.delete(
                    sidebarNotePath.fullPath
                  );
                } else {
                  newProjectSettings.pinnedNotes.add(sidebarNotePath.fullPath);
                }
                updateProjectSettings({ newProjectSettings });
              },
            },
            {
              value: 'edit-tags',
              label: (
                <span className="flex items-center gap-1.5">
                  <TagPlus height="1.0625rem" width="1.0625rem" />
                  <span>Edit Tags</span>
                </span>
              ),
              onChange: () => {
                const selectionRange = new Set([
                  `note:${sidebarNotePath.note}`,
                ]);
                setDialogData({
                  isOpen: true,
                  isPending: false,
                  title: 'Edit Tags',
                  dialogClassName: 'w-[min(30rem,90vw)]',
                  children: (errorText) => (
                    <EditTagDialogChildren
                      selectionRange={selectionRange}
                      folder={sidebarNotePath.folder}
                      errorText={errorText}
                    />
                  ),
                  onSubmit: async (e, setErrorText) => {
                    return await editTags({
                      e,
                      setErrorText,
                      selectionRange,
                      folder: sidebarNotePath.folder,
                    });
                  },
                });
              },
            },
            {
              value: 'move-to-trash',
              label: (
                <span className="flex items-center gap-1.5">
                  <Trash height="1.0625rem" width="1.0625rem" />
                  <span>Move to Trash</span>
                </span>
              ),
              onChange: () => {
                moveToTrash({ paths: [sidebarNotePath.fullPath] });
              },
            },
          ],
        });
      }}
    >
      <ListNoteSidebarItem
        sidebarNotePath={sidebarNotePath}
        activeNotePath={activeNotePath}
      />
    </button>
  );
}
