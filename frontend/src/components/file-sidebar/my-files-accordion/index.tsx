import { useAtom } from 'jotai';
import type { RefObject } from 'react';
import { fileSidebarOpenStateAtom } from '@/atoms';
import { VirtualizedFileTree } from '@components/virtualized/virtualized-file-tree';
import { Note } from '@/icons/page';
import { AccordionButton } from '@components/accordion/accordion-button';
import { SidebarAccordionPanel } from '../sidebar-accordion-panel';
import type { SidebarFlexWeights } from '@/atoms';
import type { FlexWeightMVs } from '../index';
export function MyFilesAccordion({
  containerRef,
  flexWeightMVs,
  storedWeightsRef,
}: {
  containerRef: RefObject<HTMLElement | null>;
  flexWeightMVs: FlexWeightMVs;
  storedWeightsRef: RefObject<SidebarFlexWeights>;
}) {
  const [openState, setOpenState] = useAtom(fileSidebarOpenStateAtom);
  const isOpen = openState.files;

  return (
    <SidebarAccordionPanel
      isOpen={isOpen}
      panelKey="files"
      containerRef={containerRef}
      flexWeightMVs={flexWeightMVs}
      storedWeightsRef={storedWeightsRef}
      trigger={
        <AccordionButton
          isOpen={isOpen}
          onClick={() =>
            setOpenState((prev) => ({
              ...prev,
              files: !prev.files,
            }))
          }
          icon={
            <Note
              width="1.125rem"
              height="1.125rem"
              strokeWidth={1.75}
              className="will-change-transform"
            />
          }
          title="Files"
        />
      }
    >
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden [scrollbar-width:none]">
        <VirtualizedFileTree />
      </div>
    </SidebarAccordionPanel>
  );
}
