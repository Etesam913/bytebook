import { type MotionValue, motion } from 'motion/react';
import { useAtomValue } from 'jotai';
import { getDefaultButtonVariants } from '../../animations.ts';
import { isFullscreenAtom } from '../../atoms.ts';
import { useRenameEvents } from '../virtualized/virtualized-file-tree/hooks/use-rename-events';
import { useDeleteEvents } from '../virtualized/virtualized-file-tree/hooks/use-delete-events';
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
import { MyKernelsAccordion } from './my-kernels-accordion/index.tsx';
import { MySavedSearchesAccordion } from './my-saved-searches-accordion/index.tsx';
import { Tooltip } from '../tooltip/index.tsx';
import { cn } from '../../utils/string-formatting.ts';
import { useCreateEvents } from '../virtualized/virtualized-file-tree/hooks/use-create-events.ts';

export function FileSidebar({ width }: { width: MotionValue<number> }) {
  useCreateEvents();
  useDeleteEvents();
  useRenameEvents();

  const isFullscreen = useAtomValue(isFullscreenAtom);

  return (
    <>
      <motion.aside
        style={{ width }}
        className="text-md flex h-full flex-col shrink-0"
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
        </header>
        <section className="px-2.5 pt-4">
          <SearchBar />
        </section>
        <section className="flex flex-1 flex-col min-h-0 px-1 pt-1.5 pb-1 [&>*+*]:-mt-[1.25px]">
          <MyFilesAccordion />
          <PinnedNotesAccordion />
          <RecentNotesAccordion />
          <MyKernelsAccordion />
          <MyTagsAccordion />
          <MySavedSearchesAccordion />
        </section>
        <BottomItems />
      </motion.aside>
      <Spacer width={width} />
    </>
  );
}
