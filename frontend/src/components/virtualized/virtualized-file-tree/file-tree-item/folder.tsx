import { useSetAtom, useAtomValue } from 'jotai';
import { Dispatch, SetStateAction, useState } from 'react';
import { Folder } from '../../../../icons/folder';
import { FolderOpen } from '../../../../icons/folder-open';
import { FolderPlus } from '../../../../icons/folder-plus';
import { Note } from '../../../../icons/page';
import { BYTEBOOK_DRAG_DATA_FORMAT } from '../../../../utils/draggable';
import type { FlattenedFileOrFolder } from '../types';
import { fileOrFolderMapAtom } from '..';
import { contextMenuDataAtom } from '../../../../atoms';
import { useFolderRenameInlineMutation } from '../../../../hooks/folders';
import { currentZoomAtom } from '../../../../hooks/resize';
import {
  InlineTreeItemInput,
  useInlineTreeItemInput,
} from './inline-tree-item-input';
import { AddNewInlineInput } from './add-new-inline-input';
import {
  OpenFolderAndAddToFileWatcher,
  CloseFolderAndRemoveFromFileWatcher,
} from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { Finder } from '../../../../icons/finder';
import { useRevealInFinderMutation } from '../../../../hooks/code';

type OpenFolderArgs = {
  pathToFolder: string;
  folderId: string;
  isLoadMore?: boolean;
};

export function FileTreeFolderItem({
  dataItem,
  openFolder,
}: {
  dataItem: FlattenedFileOrFolder;
  openFolder: (args: OpenFolderArgs) => void;
}) {
  const [addingType, setAddingType] = useState<'folder' | 'note' | null>(null);
  const setFileOrFolderMap = useSetAtom(fileOrFolderMapAtom);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const currentZoom = useAtomValue(currentZoomAtom);
  const { mutateAsync: renameFolder } = useFolderRenameInlineMutation();
  const { mutate: revealInFinder } = useRevealInFinderMutation();

  async function onRename({
    newName,
    setErrorText,
    exitEditMode,
  }: {
    newName: string;
    setErrorText: Dispatch<SetStateAction<string>>;
    exitEditMode: () => void;
  }) {
    // Construct the new folder path
    const pathSegments = dataItem.path.split('/');
    pathSegments[pathSegments.length - 1] = newName;
    const newFolderPath = pathSegments.join('/');

    try {
      await renameFolder({
        oldFolderPath: dataItem.path,
        newFolderName: newFolderPath,
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
      defaultValue: dataItem.name,
      onSave: onRename,
    });

  async function handleClick() {
    if (dataItem.type !== 'folder') {
      return;
    }

    if (!dataItem.isOpen) {
      openFolder({
        pathToFolder: dataItem.path,
        folderId: dataItem.id,
      });
      await OpenFolderAndAddToFileWatcher(dataItem.path);
    } else {
      setFileOrFolderMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(dataItem.id, { ...dataItem, isOpen: false });
        return newMap;
      });
      // Remove folder from file watcher when closing
      await CloseFolderAndRemoveFromFileWatcher(dataItem.path);
    }
  }

  const innerContent = (
    <>
      <span className="rounded-md flex items-center gap-2 z-10 py-1 px-2 overflow-hidden w-full hover:bg-zinc-100 dark:hover:bg-zinc-650 focus:bg-zinc-100 dark:focus:bg-zinc-650">
        {dataItem.type === 'folder' && dataItem.isOpen ? (
          <FolderOpen
            className="min-w-4 min-h-4 will-change-transform"
            height={16}
            width={16}
            strokeWidth={1.75}
          />
        ) : (
          <Folder
            className="min-w-4 min-h-4 will-change-transform"
            height={16}
            width={16}
            strokeWidth={1.75}
          />
        )}
        <InlineTreeItemInput
          dataItem={dataItem}
          defaultValue={dataItem.name}
          isEditing={isEditing}
          errorText={errorText}
          exitEditMode={exitEditMode}
          onSave={onSaveHandler}
        />
      </span>
    </>
  );

  const inlineInput = addingType &&
    dataItem.type === 'folder' &&
    dataItem.isOpen && (
      <AddNewInlineInput
        dataItem={dataItem}
        addType={addingType}
        onClose={() => setAddingType(null)}
      />
    );

  if (isEditing) {
    return (
      <>
        <div className="flex items-center w-full relative rounded-md py-0.25">
          {innerContent}
        </div>
      </>
    );
  }

  return (
    <div className="w-full">
      <button
        draggable
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(e.dataTransfer.getData(BYTEBOOK_DRAG_DATA_FORMAT));
        }}
        onClick={handleClick}
        onContextMenu={(e) => {
          if (dataItem.type !== 'folder') return;
          e.preventDefault();
          setContextMenuData({
            x: e.clientX / currentZoom,
            y: e.clientY / currentZoom,
            isShowing: true,
            items: [
              {
                label: (
                  <span className="flex items-center gap-1.5">
                    <Finder height={17} width={17} />{' '}
                    <span>Reveal In Finder</span>
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
                label: (
                  <span className="flex items-center gap-1.5">
                    <FolderPlus width={17} height={17} />{' '}
                    <span>Add Folder</span>
                  </span>
                ),
                value: 'add-folder',
                onChange: () => {
                  if (!dataItem.isOpen) {
                    openFolder({
                      pathToFolder: dataItem.path,
                      folderId: dataItem.id,
                    });
                  }
                  setAddingType('folder');
                },
              },
              {
                label: (
                  <span className="flex items-center gap-1.5">
                    <Note width={17} height={17} /> <span>Add Note</span>
                  </span>
                ),
                value: 'add-note',
                onChange: () => {
                  if (!dataItem.isOpen) {
                    openFolder({
                      pathToFolder: dataItem.path,
                      folderId: dataItem.id,
                    });
                  }
                  setAddingType('note');
                },
              },
            ],
          });
        }}
        className="flex items-center w-full relative rounded-md py-0.25"
      >
        {innerContent}
      </button>
      {inlineInput}
    </div>
  );
}
