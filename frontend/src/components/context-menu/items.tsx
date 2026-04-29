import type { ReactNode } from 'react';
import { useSetAtom } from 'jotai/react';
import { navigate } from 'wouter/use-browser-location';
import { dialogDataAtom } from '../../atoms';
import {
  useMoveToTrashMutation,
  usePinPathMutation,
  useRevealInFinderMutation,
} from '../../hooks/notes';
import { useEditTagsFormMutation } from '../../hooks/tags';
import { Finder } from '../../icons/finder';
import { FolderOpen } from '../../icons/folder-open';
import { PinTack2 } from '../../icons/pin-tack-2';
import { PinTackSlash } from '../../icons/pin-tack-slash';
import { TagPlus } from '../../icons/tag-plus';
import { Trash } from '../../icons/trash';
import { FilePen } from '../../icons/file-pen';
import { EditTagDialogChildren } from '../../routes/notes-sidebar/edit-tag-dialog-children';
import type { DropdownItem } from '../../types';
import type { FileOrFolderPath, FilePath } from '../../utils/path';

const ICON_PROPS = { height: '1.0625rem', width: '1.0625rem' } as const;

export function MenuItemLabel({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      <span>{children}</span>
    </span>
  );
}

/**
 * Returns factories for the context-menu items that are reused across the app
 * (reveal in Finder, pin/unpin, move to trash, rename, edit tags). Each factory
 * returns a single `DropdownItem`; consumers spread or conditionally include
 * the result inside the `items` array passed to `setContextMenuData`.
 */
export function useContextMenuItems() {
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { mutate: pinPath } = usePinPathMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutation();
  const { mutateAsync: editTags } = useEditTagsFormMutation();
  const setDialogData = useSetAtom(dialogDataAtom);

  return {
    revealInFinder: ({ path }: { path: FileOrFolderPath }): DropdownItem => ({
      value: 'reveal-in-finder',
      label: (
        <MenuItemLabel icon={<Finder {...ICON_PROPS} />}>
          Reveal in Finder
        </MenuItemLabel>
      ),
      onChange: () => revealInFinder({ path }),
    }),
    openInFiles: ({ path }: { path: FilePath }): DropdownItem => ({
      value: 'open-in-files',
      label: (
        <MenuItemLabel icon={<FolderOpen {...ICON_PROPS} />}>
          Open in Files
        </MenuItemLabel>
      ),
      onChange: () => navigate(path.encodedFileUrl),
    }),

    pin: ({
      paths,
      shouldPin,
      kind,
    }: {
      paths: string[];
      shouldPin: boolean;
      kind: 'note' | 'folder';
    }): DropdownItem => {
      const isPlural = paths.length > 1;
      const noun =
        kind === 'note'
          ? isPlural
            ? 'Notes'
            : 'Note'
          : isPlural
            ? 'Folders'
            : 'Folder';
      const verb = shouldPin ? 'Pin' : 'Unpin';
      const icon = shouldPin ? (
        <PinTack2 {...ICON_PROPS} />
      ) : (
        <PinTackSlash {...ICON_PROPS} />
      );
      return {
        value: shouldPin ? `pin-${kind}` : `unpin-${kind}`,
        label: (
          <MenuItemLabel icon={icon}>
            {verb} {noun}
          </MenuItemLabel>
        ),
        onChange: () => {
          paths.forEach((path) => pinPath({ path, shouldPin }));
        },
      };
    },

    moveToTrash: ({ paths }: { paths: string[] }): DropdownItem => ({
      value: 'move-to-trash',
      label: (
        <MenuItemLabel icon={<Trash {...ICON_PROPS} />}>
          Move to Trash
        </MenuItemLabel>
      ),
      onChange: () => moveToTrash({ paths }),
    }),

    rename: ({ onRename }: { onRename: () => void }): DropdownItem => ({
      value: 'rename',
      label: (
        <MenuItemLabel icon={<FilePen {...ICON_PROPS} />}>Rename</MenuItemLabel>
      ),
      onChange: onRename,
    }),

    editTags: ({
      folder,
      selectionRange,
    }: {
      folder: string;
      selectionRange: Set<string>;
    }): DropdownItem => ({
      value: 'edit-tags',
      label: (
        <MenuItemLabel icon={<TagPlus {...ICON_PROPS} />}>
          Edit Tags
        </MenuItemLabel>
      ),
      onChange: () => {
        setDialogData({
          isOpen: true,
          isPending: false,
          title: 'Edit Tags',
          dialogClassName: 'w-[min(30rem,90vw)]',
          children: (errorText) => (
            <EditTagDialogChildren
              selectionRange={selectionRange}
              folder={folder}
              errorText={errorText}
            />
          ),
          onSubmit: async (formData, setErrorText) => {
            return await editTags({
              formData,
              setErrorText,
              selectionRange,
              folder,
            });
          },
        });
      },
    }),
  };
}
