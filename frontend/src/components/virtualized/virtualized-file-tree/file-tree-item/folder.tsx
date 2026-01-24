import { useSetAtom } from 'jotai';
import { Dispatch, SetStateAction, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Folder } from '../../../../icons/folder';
import { FolderOpen } from '../../../../icons/folder-open';
import { SidebarHighlight } from '../../virtualized-list/highlight';
import { BYTEBOOK_DRAG_DATA_FORMAT } from '../../../../utils/draggable';
import { encodeContextMenuData } from '../../../../utils/string-formatting';
import type { FlattenedFileOrFolder } from '../types';
import { fileOrFolderMapAtom } from '..';
import { useFolderRenameInlineMutation } from '../../../../hooks/folders';
import { useWailsEvent } from '../../../../hooks/events';
import {
  InlineTreeItemInput,
  useInlineTreeItemInput,
} from './inline-tree-item-input';
import { AddNewInlineInput } from './add-new-inline-input';
import {
  OpenFolderAndAddToFileWatcher,
  CloseFolderAndRemoveFromFileWatcher,
} from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';

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
  const [isHovered, setIsHovered] = useState(false);
  const [addingType, setAddingType] = useState<'folder' | 'note' | null>(null);
  const setFileOrFolderMap = useSetAtom(fileOrFolderMapAtom);
  const { mutateAsync: renameFolder } = useFolderRenameInlineMutation();
  const contextMenuData = encodeContextMenuData(dataItem.id);

  // Listen to context menu add folder events
  useWailsEvent('context-menu:add-folder', (event) => {
    const eventData = event.data as string | string[];
    const eventPath = Array.isArray(eventData) ? eventData[0] : eventData;
    if (eventPath === dataItem.id && dataItem.type === 'folder') {
      // If folder is not open, open it first
      if (!dataItem.isOpen) {
        openFolder({
          pathToFolder: dataItem.id,
          folderId: dataItem.id,
        });
      }
      setAddingType('folder');
    }
  });

  // Listen to context menu add note events
  useWailsEvent('context-menu:add-note', (event) => {
    const eventData = event.data as string | string[];
    const eventPath = Array.isArray(eventData) ? eventData[0] : eventData;
    if (eventPath === dataItem.id && dataItem.type === 'folder') {
      // If folder is not open, open it first
      if (!dataItem.isOpen) {
        openFolder({
          pathToFolder: dataItem.id,
          folderId: dataItem.id,
        });
      }
      setAddingType('note');
    }
  });

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
    const pathSegments = dataItem.id.split('/');
    pathSegments[pathSegments.length - 1] = newName;
    const newFolderPath = pathSegments.join('/');

    try {
      await renameFolder({
        oldFolderPath: dataItem.id,
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
        pathToFolder: dataItem.id,
        folderId: dataItem.id,
      });
      await OpenFolderAndAddToFileWatcher(dataItem.id);
    } else {
      setFileOrFolderMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(dataItem.id, { ...dataItem, isOpen: false });
        return newMap;
      });
      // Remove folder from file watcher when closing
      await CloseFolderAndRemoveFromFileWatcher(dataItem.id);
    }
  }

  const innerContent = (
    <>
      <AnimatePresence>
        {isHovered && (
          <SidebarHighlight
            layoutId={'file-tree-item-highlight'}
            className="w-[calc(100%-15px)] ml-3.75"
          />
        )}
      </AnimatePresence>
      <span className="rounded-md flex items-center gap-2 z-10 py-1 px-2 ml-3.75 overflow-hidden w-full">
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
        style={
          {
            '--custom-contextmenu': 'folder-menu',
            '--custom-contextmenu-data': contextMenuData,
          } as React.CSSProperties
        }
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        className="flex items-center w-full relative rounded-md py-0.25"
      >
        {innerContent}
      </button>
      {inlineInput}
    </div>
  );
}
