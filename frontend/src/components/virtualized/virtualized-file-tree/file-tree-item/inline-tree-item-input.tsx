import { useEffect, useRef } from 'react';
import { File, Folder } from '../types';
import { Tooltip } from '../../../tooltip';

export function InlineTreeItemInput({
  dataItem,
  defaultValue,
  isEditing,
  errorText,
  exitEditMode,
  onSave,
  extension,
  placeholder,
}: {
  dataItem: File | Folder;
  defaultValue: string;
  isEditing: boolean;
  errorText: string;
  exitEditMode: () => void;
  onSave: (newName: string) => void;
  extension?: string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();

      if (isEditing) {
        inputRef.current.select();
      }
    }
  }, [inputRef, isEditing]);

  return (
    <>
      {isEditing ? (
        <div className="w-full">
          <div className="flex items-center gap-1 justify-between w-full">
            <input
              ref={inputRef}
              className="bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-(--accent-color) rounded-sm w-full truncate text-zinc-900 dark:text-zinc-100"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              defaultValue={defaultValue}
              placeholder={placeholder}
              title={errorText}
              autoFocus={true}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  exitEditMode();
                  // Prevents exiting fullscreen mode
                  e.preventDefault();
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
        <Tooltip
          content={dataItem.name}
          placement="right"
          withArrow={false}
          delay={{ open: 1000, close: 100 }}
        >
          <span className="truncate min-w-0 flex">
            <span className="truncate">{defaultValue}</span>
            {extension && <span className="shrink-0">.{extension}</span>}
          </span>
        </Tooltip>
      )}
    </>
  );
}
