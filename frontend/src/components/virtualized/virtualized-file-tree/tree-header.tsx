import { MotionButton } from '@components/buttons';
import { getDefaultButtonVariants } from '@/animations';
import { FolderPen } from '@/icons/folder-pen';

export function TreeHeader({
  children,
  onCreateFolder,
}: {
  children: React.ReactNode;
  onCreateFolder: () => void;
}) {
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
          onPress={onCreateFolder}
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
    </>
  );
}
