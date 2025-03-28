import { type MotionValue, motion } from 'motion/react';
import { useSetAtom } from 'jotai';
import { useRoute } from 'wouter';
import { getDefaultButtonVariants } from '../../animations.ts';
import { dialogDataAtom } from '../../atoms';
import {
  useFolderCreate,
  useFolderDelete,
  useFolderDialogSubmit,
} from '../../hooks/folders.tsx';
import { FolderPlus } from '../../icons/folder-plus';
import { MotionButton } from '../buttons';
import { BottomItems } from './bottom-items.tsx';
import { FolderDialogChildren } from './folder-dialog-children.tsx';
import { MyFoldersAccordion } from './my-folders-accordion.tsx';
import { MyTagsAccordion } from './my-tags-accordion.tsx';
import { PinnedNotesAccordion } from './pinned-notes-accordion.tsx';
import { RecentNotesAccordion } from './recent-notes-accordion.tsx';
import { SearchBar } from './searchbar.tsx';
import { Spacer } from './spacer';

export function FolderSidebar({ width }: { width: MotionValue<number> }) {
  const [, params] = useRoute('/:folder/:note?');
  const folder = params?.folder;
  const setDialogData = useSetAtom(dialogDataAtom);
  useFolderCreate();
  useFolderDelete();
  const { mutateAsync: folderDialogSubmit } = useFolderDialogSubmit();

  if (folder === 'settings') return null;

  return (
    <>
      <motion.aside
        style={{ width }}
        className="text-md flex h-screen flex-col pt-[3.8rem]"
      >
        <header className="px-[10px]">
          <SearchBar />
          <MotionButton
            {...getDefaultButtonVariants(false, 1.025, 0.975, 1.025)}
            className="align-center mb-2 flex w-full justify-between bg-transparent"
            onClick={() =>
              setDialogData({
                isOpen: true,
                title: 'Create Folder',
                isPending: false,
                children: (errorText) => (
                  <FolderDialogChildren errorText={errorText} action="create" />
                ),
                onSubmit: async (e, setErrorText) =>
                  folderDialogSubmit({
                    e: e,
                    setErrorText: setErrorText,
                    action: 'create',
                  }),
              })
            }
          >
            Create Folder <FolderPlus className="will-change-transform" />
          </MotionButton>
        </header>
        <section className="flex flex-1 flex-col overflow-y-auto gap-2  py-1.5">
          <div className="flex h-full flex-col gap-1 px-[10px]">
            <PinnedNotesAccordion />
            <RecentNotesAccordion />
            <MyFoldersAccordion folder={folder} />
            <MyTagsAccordion />
          </div>
        </section>
        <BottomItems />
      </motion.aside>
      <Spacer width={width} />
    </>
  );
}
