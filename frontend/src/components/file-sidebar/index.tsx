import { type MotionValue, motion } from 'motion/react';
import { useAtomValue } from 'jotai';
import { getDefaultButtonVariants } from '../../animations.ts';
import { isFullscreenAtom } from '../../atoms.ts';
import {
  useFolderCreate,
  useFolderDelete,
  useFolderRename,
} from '../../hooks/folders.tsx';
import { MotionIconButton } from '../buttons/index.tsx';
import { BottomItems } from './bottom-items.tsx';
import { MyFilesAccordion } from './my-files-accordion/index.tsx';
import { MyTagsAccordion } from './my-tags-accordion/index.tsx';
import { PinnedNotesAccordion } from './pinned-notes-accordion.tsx';
import { RecentNotesAccordion } from './recent-notes-accordion.tsx';
import { SearchBar } from './searchbar.tsx';
import { Spacer } from './spacer.tsx';
import { CircleArrowLeft } from '../../icons/circle-arrow-left.tsx';
import { CircleArrowRight } from '../../icons/circle-arrow-right.tsx';
import { useRef } from 'react';
import { useAutoScrollDuringDrag } from '../../hooks/draggable.tsx';
import { ArrowRotateAnticlockwise } from '../../icons/arrow-rotate-anticlockwise.tsx';
import { MyKernelsAccordion } from './my-kernels-accordion/index.tsx';
import { useFolderFromRoute } from '../../hooks/events.tsx';
import { MySavedSearchesAccordion } from './my-saved-searches-accordion/index.tsx';
import { Tooltip } from '../tooltip/index.tsx';
import { cn } from '../../utils/string-formatting.ts';
import {
  useNoteCreate,
  useNoteDelete,
  useNoteRename,
} from '../../hooks/notes.tsx';

export function FileSidebar({ width }: { width: MotionValue<number> }) {
  useFolderCreate();
  useFolderDelete();
  useFolderRename();
  useNoteCreate();
  useNoteDelete();
  useNoteRename();

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

  if (folder === 'settings') return null;

  return (
    <>
      <motion.aside
        style={{ width }}
        className="text-md flex h-screen flex-col shrink-0"
        data-testid="file-sidebar"
      >
        <header
          className={cn(
            'px-2.5 ml-auto flex gap-1 pt-3',
            isFullscreen && 'ml-0'
          )}
        >
          <Tooltip content="Go back">
            <MotionIconButton
              {...getDefaultButtonVariants()}
              onClick={() => window.history.back()}
              data-testid="go-back-button"
            >
              <CircleArrowLeft width={18} height={18} />
            </MotionIconButton>
          </Tooltip>
          <Tooltip content="Go forward">
            <MotionIconButton
              {...getDefaultButtonVariants()}
              onClick={() => window.history.forward()}
              data-testid="go-forward-button"
            >
              <CircleArrowRight width={19} height={18} />
            </MotionIconButton>
          </Tooltip>
          <Tooltip content="Refresh">
            <MotionIconButton
              {...getDefaultButtonVariants()}
              onClick={() => {
                window.location.reload();
                console.log('refresh');
              }}
            >
              <ArrowRotateAnticlockwise width={16} height={16} />
            </MotionIconButton>
          </Tooltip>
        </header>
        <section className="px-2.5 pt-4">
          <SearchBar />
          {/* <Tooltip
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
          </Tooltip> */}
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
            <MyFilesAccordion />
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
