import { useEffect, useRef, useState } from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { MotionButton } from '../buttons';
import { Blog } from '../../icons/blog';
import { Folder as FolderIcon } from '../../icons/folder';
import { useAddTreeItemMutation } from '../virtualized/virtualized-file-tree/hooks/tree-item-mutations';
import { type Folder } from '../virtualized/virtualized-file-tree/types';

export function FolderRendererCreateItemCard({ folder }: { folder: Folder }) {
  const [creatingItemType, setCreatingItemType] = useState<
    'folder' | 'note' | null
  >(null);
  const {
    mutate: addTreeItem,
    isPending: isCreatingItem,
    error: createItemError,
    reset: resetCreateItemMutation,
  } = useAddTreeItemMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!creatingItemType) {
      return;
    }

    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [creatingItemType]);

  const createItemErrorText =
    createItemError instanceof Error
      ? createItemError.message
      : createItemError
        ? 'An error occurred'
        : '';

  function closeCreateItemCard() {
    resetCreateItemMutation();
    setCreatingItemType(null);
    setValue('');
  }

  function handleCreateItemSave(newName: string) {
    const trimmedName = newName.trim();

    if (!trimmedName || !creatingItemType) {
      closeCreateItemCard();
      return;
    }

    if (isCreatingItem) {
      return;
    }

    addTreeItem({
      parentFolder: folder,
      addType: creatingItemType,
      newName: trimmedName,
      onSuccess: closeCreateItemCard,
    });
  }

  const isCreatingFolder = creatingItemType === 'folder';
  const previewName =
    value.trim() || (isCreatingFolder ? 'New folder' : 'New note');
  const previewPath = isCreatingFolder
    ? `${folder.path}/${previewName}`
    : `${folder.path}/${previewName}.md`;

  return (
    <>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-8 pt-1 pb-3">
        <MotionButton
          {...getDefaultButtonVariants({ disabled: isCreatingItem })}
          aria-label="Create folder"
          className="shrink-0 flex items-center gap-2 text-sm"
          onClick={() => {
            resetCreateItemMutation();
            setValue('');
            setCreatingItemType('folder');
          }}
        >
          <FolderIcon width={16} height={16} />
          Create folder
        </MotionButton>
        <MotionButton
          {...getDefaultButtonVariants({ disabled: isCreatingItem })}
          aria-label="Create note"
          className="shrink-0 flex items-center gap-2 text-sm"
          onClick={() => {
            resetCreateItemMutation();
            setValue('');
            setCreatingItemType('note');
          }}
        >
          <Blog width={16} height={16} />
          Create note
        </MotionButton>
      </div>
      {creatingItemType && (
        <div className="mx-auto flex max-w-6xl flex-wrap gap-3 px-8">
          <div className="flex w-full flex-none sm:w-[calc(50%-0.375rem)] xl:w-[calc(33.333%-0.5rem)]">
            <div className="flex w-full items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left dark:border-zinc-650 dark:bg-zinc-700">
              <span className="mt-0.75">
                {isCreatingFolder ? (
                  <FolderIcon
                    className="min-w-4 min-h-4"
                    height={16}
                    width={16}
                    strokeWidth={1.75}
                  />
                ) : (
                  <Blog
                    className="min-w-4 min-h-4"
                    height={16}
                    width={16}
                    strokeWidth={1.75}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <input
                    ref={inputRef}
                    className="w-full truncate bg-transparent text-sm font-medium leading-5 outline-none"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={value}
                    placeholder={isCreatingFolder ? 'New folder' : 'New note'}
                    title={createItemErrorText}
                    disabled={isCreatingItem}
                    onChange={(e) => {
                      setValue(e.currentTarget.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        closeCreateItemCard();
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateItemSave(e.currentTarget.value);
                      }
                    }}
                    onBlur={(e) => {
                      handleCreateItemSave(e.currentTarget.value);
                    }}
                  />
                  {!isCreatingFolder && (
                    <span className="text-xs leading-4 text-zinc-500 dark:text-zinc-400">
                      .md
                    </span>
                  )}
                </div>
                <span className="block truncate text-xs leading-4 text-zinc-500 dark:text-zinc-400">
                  {previewPath}
                </span>
                {createItemErrorText && (
                  <span className="block pt-1 text-xs text-red-500 dark:text-red-500">
                    {createItemErrorText}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
