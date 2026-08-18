import { useEffect, useRef } from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { MotionButton } from '../buttons';
import { Blog } from '../../icons/blog';
import { Folder as FolderIcon } from '../../icons/folder';
import { useCreateTreeItemForm } from '../../hooks/tree-items';
import { FILE_TYPE, FOLDER_TYPE } from '../../utils/tree-item-types';
import type { FolderPath } from '../../utils/path';

export function FolderRendererCreateItemCard({
  folderPath,
}: {
  folderPath: FolderPath;
}) {
  const {
    creatingItemType,
    name,
    setName,
    isPending,
    errorText,
    startCreating,
    cancelCreating,
    submit,
  } = useCreateTreeItemForm({ parentFolderPath: folderPath.fullPath });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!creatingItemType) {
      return;
    }

    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [creatingItemType]);

  const isCreatingFolder = creatingItemType === FOLDER_TYPE;
  const previewName =
    name.trim() || (isCreatingFolder ? 'New folder' : 'New note');
  const previewPath = isCreatingFolder
    ? `${folderPath.fullPath}${previewName}`
    : `${folderPath.fullPath}${previewName}.md`;

  return (
    <div>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-8 pt-1 pb-3">
        <MotionButton
          {...getDefaultButtonVariants({ disabled: isPending })}
          aria-label="Create folder"
          className="shrink-0 flex items-center gap-2 text-sm"
          onClick={() => startCreating(FOLDER_TYPE)}
        >
          <FolderIcon width="1rem" height="1rem" />
          Create folder
        </MotionButton>
        <MotionButton
          {...getDefaultButtonVariants({ disabled: isPending })}
          aria-label="Create note"
          className="shrink-0 flex items-center gap-2 text-sm"
          onClick={() => startCreating(FILE_TYPE)}
        >
          <Blog width="1rem" height="1rem" />
          Create note
        </MotionButton>
      </div>
      {creatingItemType && (
        <div className="mx-auto grid max-w-6xl gap-3 px-8 grid-cols-[repeat(auto-fill,minmax(280px,1fr))] my-3">
          <div>
            <div className="flex w-full items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left dark:border-zinc-650 dark:bg-zinc-700">
              <span className="mt-0.75">
                {isCreatingFolder ? (
                  <FolderIcon
                    className="min-w-4 min-h-4"
                    height="1rem"
                    width="1rem"
                    strokeWidth={1.75}
                  />
                ) : (
                  <Blog
                    className="min-w-4 min-h-4"
                    height="1rem"
                    width="1rem"
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
                    value={name}
                    placeholder={isCreatingFolder ? 'New folder' : 'New note'}
                    title={errorText}
                    disabled={isPending}
                    onChange={(e) => {
                      setName(e.currentTarget.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelCreating();
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    onBlur={submit}
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
                {errorText && (
                  <span className="block pt-1 text-xs text-red-500 dark:text-red-500">
                    {errorText}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
