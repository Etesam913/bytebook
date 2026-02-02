import { MotionButton } from '../../buttons';
import { FolderPlus } from '../../../icons/folder-plus';
import { getDefaultButtonVariants } from '../../../animations';
import { InlineTreeItemInput } from './file-tree-item/inline-tree-item-input';
import { Folder as FolderIcon } from '../../../icons/folder';
import { useFileTreeFolderAddActions } from './file-tree-item/folder/hooks';
import { Folder } from './types';

export function CreateFolder() {
  const {
    addingType,
    setAddingType,
    addErrorText,
    closeAddInput,
    onAddSave,
    resetAddTreeItem,
  } = useFileTreeFolderAddActions({ dataItem: null });

  const newFolderPlaceholder: Folder = {
    id: 'new-folder-input',
    path: '',
    name: '',
    parentId: null,
    type: 'folder',
    childrenIds: [],
    childrenCursor: null,
    hasMoreChildren: false,
    isOpen: false,
  };

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="px-1 py-2">
        <MotionButton
          {...getDefaultButtonVariants({
            whileHover: 1.025,
            whileTap: 0.975,
            whileFocus: 1.025,
          })}
          className="w-full text-sm text-center flex items-center justify-center"
          onClick={() => {
            closeAddInput();
            resetAddTreeItem();
            setAddingType('folder');
          }}
        >
          <FolderPlus
            className="will-change-transform"
            width={16}
            height={16}
          />
          <span>Create Folder</span>
        </MotionButton>
      </div>
      {addingType === 'folder' && (
        <div className="flex items-center w-full relative rounded-md py-0.25 pl-4.5">
          <span className="rounded-md flex items-center gap-2 z-10 py-1 overflow-hidden w-full">
            <FolderIcon
              className="min-w-4 min-h-4"
              height={16}
              width={16}
              strokeWidth={1.75}
            />
            <InlineTreeItemInput
              dataItem={newFolderPlaceholder}
              defaultValue=""
              isEditing={true}
              errorText={addErrorText}
              exitEditMode={closeAddInput}
              onSave={onAddSave}
              placeholder="New folder"
            />
          </span>
        </div>
      )}
    </div>
  );
}
