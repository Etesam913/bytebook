import { useAtom } from 'jotai';
import { useRef } from 'react';
import { fileSidebarOpenStateAtom } from '../../../atoms';
import { VirtualizedFileTree } from '../../virtualized/virtualized-file-tree';
import { Note } from '../../../icons/page';
import { AccordionButton } from '../../accordion/accordion-button';
import { SidebarAccordionPanel } from '../sidebar-accordion-panel';
import { useAutoScrollDuringDrag } from '../../../hooks/draggable';

export function MyFilesAccordion() {
  const [openState, setOpenState] = useAtom(fileSidebarOpenStateAtom);
  const isOpen = openState.folders;
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const { onDragOver, onDragLeave, onDrop } = useAutoScrollDuringDrag(
    scrollContainerRef,
    { threshold: 60, speed: 20 }
  );

  return (
    <SidebarAccordionPanel
      isOpen={isOpen}
      flexWeight={1.5}
      trigger={
        <AccordionButton
          isOpen={isOpen}
          onClick={() =>
            setOpenState((prev) => ({
              ...prev,
              folders: !prev.folders,
            }))
          }
          icon={
            <Note
              width={18}
              height={18}
              strokeWidth={1.75}
              className="will-change-transform"
            />
          }
          title="Files"
        />
      }
    >
      <div
        className="flex flex-1 flex-col min-h-0 overflow-hidden scrollbar-hidden"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <VirtualizedFileTree scrollContainerRef={scrollContainerRef} />
      </div>
    </SidebarAccordionPanel>
  );
}
