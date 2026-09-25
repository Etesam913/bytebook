import { MotionButton } from '@components/buttons';
import { FieldError } from 'react-aria-components/FieldError';
import { Input } from 'react-aria-components/Input';
import { TextField } from 'react-aria-components/TextField';
import { getDefaultButtonVariants } from '@/animations';
import { Folder } from '@/icons/folder';
import { FolderPen } from '@/icons/folder-pen';
import { useCreateTreeItemForm } from '@hooks/tree-items';
import { FOLDER_TYPE } from '@utils/tree-item-types';

/**
 * "Create Folder" button that expands into an inline name input. `children`
 * (the filter input) sits between them so the name input appears below it.
 * The pierre model picks up the new path via the `folder:create` Wails event.
 */
export function TreeHeader({ children }: { children: React.ReactNode }) {
  const {
    creatingItemType,
    name,
    setName,
    errorText,
    startCreating,
    cancelCreating,
    submit,
  } = useCreateTreeItemForm({ parentFolderPath: null });

  return (
    <>
      <div className="px-2 py-2 w-full">
        <MotionButton
          {...getDefaultButtonVariants({
            whileHover: 1.025,
            whileTap: 0.975,
            whileFocus: 1.025,
          })}
          className="w-full text-sm text-center flex items-center justify-center"
          onPress={() => startCreating(FOLDER_TYPE)}
        >
          <FolderPen
            className="will-change-transform"
            width="1rem"
            height="1rem"
          />
          <span>Create Folder</span>
        </MotionButton>
      </div>
      {children}
      {creatingItemType && (
        <TextField
          className="px-[8px] w-full"
          aria-label="New folder name"
          autoFocus
          value={name}
          onChange={setName}
          onBlur={submit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancelCreating();
            }
          }}
          isInvalid={errorText.length > 0}
        >
          {/* Mirrors a root pierre row; the tree insets rows by a fixed 8px regardless of UI scale. */}
          <div className="flex items-center h-[calc(30px*var(--ui-scale))] px-[calc(8px*var(--ui-scale))] gap-[calc(6px*var(--ui-scale))] rounded-[calc(6px*var(--ui-scale))]">
            <span className="flex shrink-0 justify-center w-[calc(16px*var(--ui-scale))]">
              <Folder
                width="calc(16px * var(--ui-scale))"
                height="calc(16px * var(--ui-scale))"
              />
            </span>
            <Input
              className="min-w-0 w-full h-[calc(30px*var(--ui-scale)-4px)] px-0 bg-transparent border-0 outline-none text-sm placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
              placeholder="New folder"
              maxLength={75}
            />
          </div>
          <FieldError className="text-red-500 text-xs pt-1 pb-1.5">
            {errorText}
          </FieldError>
        </TextField>
      )}
    </>
  );
}
