import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { useWailsEvent } from '../../../../hooks/events';
import { NAME_CHARS } from '../../../../utils/string-formatting';
import { FlattenedFileOrFolder } from '../types';

/**
 * Hook to manage file/folder editing state and rename logic.
 * Returns editing state, error text, and handlers for use in parent components.
 */
export function useInlineTreeItemInput({
  itemId,
  defaultValue,
  onSave,
}: {
  itemId: string;
  defaultValue: string;
  onSave: (args: {
    newName: string;
    setErrorText: Dispatch<SetStateAction<string>>;
    exitEditMode: () => void;
  }) => void;
}) {
  const [errorText, setErrorText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Listen to context menu rename events
  useWailsEvent('context-menu:rename', (event) => {
    const eventData = event.data as string | string[];
    // Handle both string and string[] formats for backwards compatibility
    const eventPath = Array.isArray(eventData) ? eventData[0] : eventData;
    console.log({ eventPath, itemId });
    if (eventPath === itemId) {
      setIsEditing(true);
    }
  });

  function exitEditMode() {
    setIsEditing(false);
    setErrorText('');
  }

  function onSaveHandler(newName: string) {
    const trimmedName = newName.trim();

    // Validate the name
    if (!NAME_CHARS.test(trimmedName)) {
      setErrorText(
        'Names can only contain letters, numbers, spaces, hyphens, and underscores.'
      );
      return;
    }

    // If name hasn't changed, just exit edit mode
    if (trimmedName === defaultValue) {
      exitEditMode();
      return;
    }

    onSave({ newName: trimmedName, setErrorText, exitEditMode });
  }

  return {
    isEditing,
    errorText,
    exitEditMode,
    onSaveHandler,
  };
}

export function InlineTreeItemInput({
  dataItem,
  defaultValue,
  isEditing,
  errorText,
  exitEditMode,
  onSave,
  extension,
}: {
  dataItem: FlattenedFileOrFolder;
  defaultValue: string;
  isEditing: boolean;
  errorText: string;
  exitEditMode: () => void;
  onSave: (newName: string) => void;
  extension?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Select all text when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <>
      {isEditing ? (
        <div className="w-full">
          <div className="flex items-center gap-1 justify-between w-full">
            <input
              ref={inputRef}
              className={'bg-transparent outline-none w-full truncate'}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              defaultValue={defaultValue}
              title={errorText}
              autoFocus={true}
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
