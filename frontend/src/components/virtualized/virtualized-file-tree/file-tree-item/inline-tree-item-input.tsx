import { useRef } from 'react';
import { File, Folder } from '../types';

export function InlineTreeItemInput({
  dataItem,
  defaultValue,
  isEditing,
  errorText,
  exitEditMode,
  onSave,
  extension,
  placeholder,
  autoFocus = true,
}: {
  dataItem: File | Folder;
  defaultValue: string;
  isEditing: boolean;
  errorText: string;
  exitEditMode: () => void;
  onSave: (newName: string) => void;
  extension?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {isEditing ? (
        <div className="w-full">
          <div className="flex items-center gap-1 justify-between w-full">
            <input
              ref={inputRef}
              className="bg-transparent outline-none w-full truncate text-zinc-900 dark:text-zinc-100"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              defaultValue={defaultValue}
              placeholder={placeholder}
              title={errorText}
              autoFocus={autoFocus}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  exitEditMode();
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  onSave(e.currentTarget.value);
                }
              }}
              onBlur={(e) => {
                onSave(e.currentTarget.value);
              }}
            />
            {extension && (
              <span className="text-xs text-zinc-500">.{extension}</span>
            )}
          </div>

          {errorText && (
            <div className="text-xs text-red-500 dark:text-red-500">
              {errorText}
            </div>
          )}
        </div>
      ) : (
        <span className="truncate">{dataItem.name}</span>
      )}
    </>
  );
}
