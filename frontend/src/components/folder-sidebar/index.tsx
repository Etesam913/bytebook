import { type MotionValue, motion } from 'motion/react';
import { useAtomValue } from 'jotai';
import { getDefaultButtonVariants } from '../../animations.ts';
import { isFullscreenAtom } from '../../atoms';
import {
  useFolderCreate,
  useFolderDelete,
  useFolderCreateDialogEvent,
} from '../../hooks/folders.tsx';
import { FolderPlus } from '../../icons/folder-plus';
import { MotionButton, MotionIconButton } from '../buttons';
import { BottomItems } from './bottom-items.tsx';
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
import { MySavedSearchesAccordion } from './my-saved-searches-accordion';
import { Tooltip } from '../tooltip';
import { cn } from '../../utils/string-formatting.ts';
import { useCreateFolderDialog } from '../../hooks/dialogs';
import { Command } from '../../icons/command.tsx';

export function FolderSidebar({ width }: { width: MotionValue<number> }) {
  useFolderCreate();
  useFolderDelete();
  useFolderCreateDialogEvent();

  const { folder } = useFolderFromRoute();
  const isFullscreen = useAtomValue(isFullscreenAtom);

  const sidebarAccordionSectionRef = useRef<HTMLDivElement | null>(null);
  const { onDragOver, onDragLeave, onDrop } = useAutoScrollDuringDrag(
    sidebarAccordionSectionRef,
    {
      threshold: 60,
      speed: 20,
    }
  );
  const openCreateFolderDialog = useCreateFolderDialog();

  if (folder === 'settings') return null;

  return (
    <>
      <motion.aside
        style={{ width }}
        className="text-md flex h-screen flex-col"
        data-testid="folder-sidebar"
      >
        <header
          className={cn(
            'px-2.5 pt-[0.7rem] ml-auto flex gap-1',
            isFullscreen && 'ml-0'
          )}
        >
          <Tooltip content="Go back">
            <MotionIconButton
              {...getDefaultButtonVariants()}
              onClick={() => window.history.back()}
              data-testid="go-back-button"
            >
              <CircleArrowLeft className="w-6 h-6" />
            </MotionIconButton>
          </Tooltip>
          <Tooltip content="Go forward">
            <MotionIconButton
              {...getDefaultButtonVariants()}
              onClick={() => window.history.forward()}
              data-testid="go-forward-button"
            >
              <CircleArrowRight className="w-6 h-6" />
            </MotionIconButton>
          </Tooltip>
          <Tooltip content="Refresh">
            <MotionIconButton
              {...getDefaultButtonVariants()}
              onClick={() => window.location.reload()}
            >
              <RefreshAnticlockwise className="h-6 w-6" />
            </MotionIconButton>
          </Tooltip>
        </header>
        <section className="px-2.5 pt-4">
          <SearchBar />
          <Tooltip
            placement="right"
            content={
              <span className="flex items-center gap-0.5">
                <Command
                  className="will-change-transform"
                  width={12.8}
                  height={12.8}
                />
                <p>G</p>
              </span>
            }
          >
            <MotionButton
              {...getDefaultButtonVariants({
                disabled: false,
                whileHover: 1.025,
                whileTap: 0.975,
                whileFocus: 1.025,
              })}
              className="align-center mb-2 flex w-full justify-between bg-transparent"
              onClick={openCreateFolderDialog}
            >
              Create Folder <FolderPlus className="will-change-transform" />
            </MotionButton>
          </Tooltip>
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
            <MySavedSearchesAccordion />
          </div>
        </section>
        <BottomItems />
      </motion.aside>
      <Spacer width={width} />
    </>
  );
}
