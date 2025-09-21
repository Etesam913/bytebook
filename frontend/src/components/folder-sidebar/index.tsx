import { type MotionValue, motion } from 'motion/react';
import { useSetAtom } from 'jotai';
import { getDefaultButtonVariants } from '../../animations.ts';
import { dialogDataAtom } from '../../atoms';
import {
  useFolderCreate,
  useFolderDelete,
  useFolderCreateMutation,
} from '../../hooks/folders.tsx';
import { FolderPlus } from '../../icons/folder-plus';
import { MotionButton, MotionIconButton } from '../buttons';
import { BottomItems } from './bottom-items.tsx';
import { CreateFolderDialog } from './folder-dialog-children.tsx';
import { MyFoldersAccordion } from './my-folders-accordion';
import { MyTagsAccordion } from './my-tags-accordion';
import { PinnedNotesAccordion } from './pinned-notes-accordion.tsx';
import { RecentNotesAccordion } from './recent-notes-accordion.tsx';
import { SearchBar } from './searchbar.tsx';
import { Spacer } from './spacer';
import { CircleArrowLeft } from '../../icons/circle-arrow-left.tsx';
import { CircleArrowRight } from '../../icons/circle-arrow-right.tsx';
import { useRef } from 'react';
import { useAutoScrollDuringDrag } from '../../hooks/draggable.tsx';
import { RefreshAnticlockwise } from '../../icons/refresh-anticlockwise.tsx';
import { MyKernelsAccordion } from './my-kernels-accordion';
import { useFolderFromRoute } from '../../hooks/events.tsx';

export function FolderSidebar({ width }: { width: MotionValue<number> }) {
  const sidebarAccordionSectionRef = useRef<HTMLDivElement | null>(null);
  const folder = useFolderFromRoute();
  const setDialogData = useSetAtom(dialogDataAtom);
  useFolderCreate();
  useFolderDelete();
  const { mutateAsync: createFolder } = useFolderCreateMutation();
  const { onDragOver, onDragLeave, onDrop } = useAutoScrollDuringDrag(
    sidebarAccordionSectionRef,
    {
      threshold: 60,
      speed: 20,
    }
  );

  if (folder === 'settings') return null;

  return (
    <>
      <motion.aside
        style={{ width }}
        className="text-md flex h-screen flex-col"
      >
        <header className="px-2.5 pt-[0.7rem] ml-auto flex gap-1">
          <MotionIconButton
            {...getDefaultButtonVariants()}
            onClick={() => window.history.back()}
          >
            <CircleArrowLeft className="w-6 h-6" />
          </MotionIconButton>
          <MotionIconButton
            {...getDefaultButtonVariants()}
            onClick={() => window.history.forward()}
          >
            <CircleArrowRight className="w-6 h-6" />
          </MotionIconButton>
          <MotionIconButton
            {...getDefaultButtonVariants()}
            onClick={() => window.location.reload()}
          >
            <RefreshAnticlockwise className="h-4 w-4" />
          </MotionIconButton>
        </header>
        <section className="px-2.5 pt-[1rem]">
          <SearchBar />
          <MotionButton
            {...getDefaultButtonVariants({ disabled: false, whileHover: 1.025, whileTap: 0.975, whileFocus: 1.025 })}
            className="align-center mb-2 flex w-full justify-between bg-transparent"
            onClick={() =>
              setDialogData({
                isOpen: true,
                title: 'Create Folder',
                isPending: false,
                children: (errorText) => (
                  <CreateFolderDialog errorText={errorText} />
                ),
                onSubmit: async (e, setErrorText) =>
                  createFolder({
                    e: e,
                    setErrorText: setErrorText,
                  }),
              })
            }
          >
            Create Folder <FolderPlus className="will-change-transform" />
          </MotionButton>
        </section>
        <section
          className="flex flex-1 flex-col overflow-y-auto gap-2 py-1.5"
          ref={sidebarAccordionSectionRef}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="flex h-full flex-col gap-1 px-2.5">
            <PinnedNotesAccordion />
            <RecentNotesAccordion />
            <MyFoldersAccordion />
            <MyKernelsAccordion />
            <MyTagsAccordion />
          </div>
        </section>
        <BottomItems />
      </motion.aside>
      <Spacer width={width} />
    </>
  );
}
