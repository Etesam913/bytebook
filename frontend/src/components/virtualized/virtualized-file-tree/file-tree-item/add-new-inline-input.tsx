import { useEffect, useRef, useState } from 'react';
import { AddFolder } from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/folderservice';
import { AddNoteToFolder } from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { Folder as FolderIcon } from '../../../../icons/folder';
import { Folder } from '../types';
import { Note } from '../../../../icons/page';
import { createFilePath } from '../../../../utils/path';
import { NAME_CHARS } from '../../../../utils/string-formatting';
import { navigate } from 'wouter/use-browser-location';

export function AddNewInlineInput({
  paddingLeft,
  dataItem,
  addType,
  onClose,
}: {
  paddingLeft: number;
  dataItem: Folder;
  addType: 'folder' | 'note';
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errorText, setErrorText] = useState('');

  const isAddingFolder = addType === 'folder';

  // Focus and select all text when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  async function handleSave(name: string) {
    const trimmedName = name.trim();

    // If name is empty, just exit
    if (!trimmedName) {
      onClose();
      return;
    }

    // Validate the name
    if (!NAME_CHARS.test(trimmedName)) {
      setErrorText(
        'Names can only contain letters, numbers, spaces, hyphens, and underscores.'
      );
      return;
    }

    try {
      if (isAddingFolder) {
        // Create folder: path is parentFolderId/newFolderName
        const newFolderPath = `${dataItem.path}/${trimmedName}`;
        const res = await AddFolder(newFolderPath);
        console.log({ res, newFolderPath });
        if (!res.success) {
          setErrorText(res.message);
          return;
        }
      } else {
        const newNotePath = `${dataItem.path}/${trimmedName}.md`;
        // Create note: folder is dataItem.id, note name is trimmedName
        const res = await AddNoteToFolder(dataItem.path, trimmedName);
        if (!res.success) {
          setErrorText(res.message);
          return;
        }
        const filePath = createFilePath(newNotePath);
        setTimeout(() => {
          if (filePath) {
            navigate(filePath.encodedFileUrl);
          }
        }, 300);
      }
      onClose();
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : 'An error occurred'
      );
    }
  }

  return (
    <div
      className="flex items-center w-full relative rounded-md py-0.25"
      style={{ paddingLeft: `${paddingLeft}px` }}
    >
      <span className="rounded-md flex items-center gap-2 z-10 py-1 pl-[1.725rem] pr-2 overflow-hidden w-full">
        {isAddingFolder ? (
          <FolderIcon
            className="min-w-4 min-h-4"
            height={16}
            width={16}
            strokeWidth={1.75}
          />
        ) : (
          <Note
            className="min-w-4 min-h-4"
            height={16}
            width={16}
            strokeWidth={1.75}
          />
        )}
        <div className="w-full">
          <div className="flex items-center gap-1 justify-between w-full">
            <input
              ref={inputRef}
              className="bg-transparent outline-none w-full truncate"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              defaultValue=""
              placeholder={isAddingFolder ? 'New folder' : 'New note'}
              title={errorText}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onClose();
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave(e.currentTarget.value);
                }
              }}
              onBlur={(e) => {
                handleSave(e.currentTarget.value);
              }}
            />
            {!isAddingFolder && (
              <span className="text-xs text-zinc-500">.md</span>
            )}
          </div>
          {errorText && (
            <div className="text-xs text-red-500 dark:text-red-500">
              {errorText}
            </div>
          )}
        </div>
      </span>
    </div>
  );
}
