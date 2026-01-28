import { useAtomValue, useSetAtom } from 'jotai';
import { Dispatch, MouseEvent, SetStateAction } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { Note } from '../../../../icons/page';
import { Finder } from '../../../../icons/finder';
import { contextMenuDataAtom } from '../../../../atoms';
import { useFilePathFromRoute } from '../../../../hooks/routes';
import {
  useMoveToTrashMutationNew,
  useRenameFileMutation,
} from '../../../../hooks/notes';
import { useRevealInFinderMutation } from '../../../../hooks/code';
import { currentZoomAtom } from '../../../../hooks/resize';
import { createFilePath } from '../../../../utils/path';
import { cn } from '../../../../utils/string-formatting';
import type { FlattenedFileOrFolder } from '../types';
import {
  InlineTreeItemInput,
  useInlineTreeItemInput,
} from './inline-tree-item-input';
import { Trash } from '../../../../icons/trash';

export function FileTreeFileItem({
  dataItem,
  onSelectionClick,
  onContextMenuSelection,
  isSelectedFromSidebarClick,
  paddingLeft,
}: {
  dataItem: FlattenedFileOrFolder;
  onSelectionClick: (e: MouseEvent) => void;
  onContextMenuSelection: () => void;
  isSelectedFromSidebarClick: boolean;
  paddingLeft: number;
}) {
  const filePathFromRoute = useFilePathFromRoute();
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const currentZoom = useAtomValue(currentZoomAtom);

  const { mutateAsync: renameFile } = useRenameFileMutation();
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutationNew();

  const lastDotIndex = dataItem.name.lastIndexOf('.');
  const nameWithoutExtension =
    lastDotIndex === -1 ? dataItem.name : dataItem.name.slice(0, lastDotIndex);
  const extension =
    lastDotIndex === -1 ? undefined : dataItem.name.slice(lastDotIndex + 1);

  async function onRename({
    newName,
    setErrorText,
    exitEditMode,
  }: {
    newName: string;
    setErrorText: Dispatch<SetStateAction<string>>;
    exitEditMode: () => void;
  }) {
    const filePath = createFilePath(dataItem.path);
    if (!filePath) {
      exitEditMode();
      return;
    }

    const newFilePathString = `${filePath.folder}/${newName}.md`;
    const newFilePath = createFilePath(newFilePathString);
    if (!newFilePath) {
      setErrorText('Invalid file path');
      return;
    }

    try {
      await renameFile({
        oldPath: filePath,
        newPath: newFilePath,
        setErrorText,
      });
      exitEditMode();
    } catch {
      // Error handling is done in the mutation
    }
  }

  const { isEditing, errorText, exitEditMode, onSaveHandler } =
    useInlineTreeItemInput({
      itemId: dataItem.id,
      defaultValue: nameWithoutExtension,
      onSave: onRename,
    });

  // File path should be defined for files
  const filePath = createFilePath(dataItem.path);
  if (!filePath) {
    return null;
  }

  const resolvedFilePath = filePath;

  const isSelectedFromRoute =
    filePathFromRoute && filePathFromRoute.equals(filePath);

  function handleClick(e: MouseEvent) {
    // Stop propagation for modifier clicks to prevent parent handlers from clearing selection
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.stopPropagation();
    }

    // For default click (no modifier keys), also navigate to the file
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
      navigate(resolvedFilePath.encodedFileUrl);
    }
    onSelectionClick(e);
  }

  const innerContent = (
    <>
      <span
        style={{ paddingLeft: `${paddingLeft}px` }}
        className={cn(
          'rounded-md flex items-center gap-2 z-10 py-1 px-2 overflow-hidden w-full hover:bg-zinc-100 dark:hover:bg-zinc-650 focus:bg-zinc-100 dark:focus:bg-zinc-650',
          isSelectedFromRoute &&
            'bg-zinc-150 dark:bg-zinc-600 text-(--accent-color)',
          isSelectedFromSidebarClick && 'bg-(--accent-color)! text-white!'
        )}
      >
        <Note
          className="min-w-4 min-h-4 will-change-transform"
          height={16}
          width={16}
          strokeWidth={1.75}
        />
        <InlineTreeItemInput
          dataItem={dataItem}
          defaultValue={nameWithoutExtension}
          isEditing={isEditing}
          errorText={errorText}
          exitEditMode={exitEditMode}
          onSave={onSaveHandler}
          extension={extension}
        />
      </span>
    </>
  );

  if (isEditing) {
    return (
      <div
        style={{ paddingLeft: `${paddingLeft}px` }}
        className="flex items-center w-full relative rounded-md py-0.25"
      >
        {innerContent}
      </div>
    );
  }

  return (
    <button
      draggable
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenuSelection();

        setContextMenuData({
          x: e.clientX / currentZoom,
          y: e.clientY / currentZoom,
          isShowing: true,
          items: [
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Finder height={17} width={17} />{' '}
                  <span>Reveal in Finder</span>
                </span>
              ),
              value: 'reveal-in-finder',
              onChange: () => {
                revealInFinder({
                  path: `notes/${dataItem.path}`,
                  shouldPrefixWithProjectPath: true,
                });
              },
            },
            {
              value: 'move-to-trash',
              label: (
                <span className="flex items-center gap-1.5">
                  <Trash height={17} width={17} /> <span>Move to Trash</span>
                </span>
              ),
              onChange: () => {
                moveToTrash({ path: dataItem.path });
              },
            },
          ],
        });
      }}
      className="flex items-center w-full relative rounded-md py-0.25"
    >
      {innerContent}
    </button>
  );
}
