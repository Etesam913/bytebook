import { MotionButton } from '@components/buttons';
import { AppTextField } from '@components/input';
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
        onPress={() => startCreating(FOLDER_TYPE)}
      >
        <FolderPen
          className="will-change-transform"
          width="1rem"
          height="1rem"
        />
        <span>Create Folder</span>
      </MotionButton>
      {creatingItemType && (
        <AppTextField
          className="px-1"
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
          placeholder="New folder"
          inputClassName="py-1 text-sm"
          isInvalid={errorText.length > 0}
          errorMessage={errorText}
        />
      )}
    </div>
  );
}
