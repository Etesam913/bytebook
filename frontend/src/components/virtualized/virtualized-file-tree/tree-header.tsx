import { MotionButton } from '@components/buttons';
import { getDefaultButtonVariants } from '@/animations';
import { FolderPen } from '@/icons/folder-pen';
import { useCreateTreeItemForm } from '@hooks/tree-items';
import { FOLDER_TYPE } from '@utils/tree-item-types';

/**
 * Inline header rendered inside the @pierre/trees header slot. Shows a
 * "Create Folder" button that expands into an inline name input. Submitting
 * with Enter triggers the backend mutation; the pierre model picks up the
 * new path via the `folder:create` Wails event.
 */
export function TreeHeader() {
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
    <div className="px-2 py-2 w-full flex flex-col gap-1">
      <MotionButton
        {...getDefaultButtonVariants({
          whileHover: 1.025,
          whileTap: 0.975,
          whileFocus: 1.025,
        })}
        className="w-full text-sm text-center flex items-center justify-center"
        onClick={() => startCreating(FOLDER_TYPE)}
      >
        <FolderPen
          className="will-change-transform"
          width="1rem"
          height="1rem"
        />
        <span>Create Folder</span>
      </MotionButton>
      {creatingItemType && (
        <div className="flex flex-col gap-1 px-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            placeholder="New folder"
            className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm focus:outline-2 focus:outline-(--accent-color)"
          />
          {errorText && (
            <span className="text-xs text-red-500">{errorText}</span>
          )}
        </div>
      )}
    </div>
  );
}
