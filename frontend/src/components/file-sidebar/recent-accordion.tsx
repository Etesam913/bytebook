import { useAtom } from 'jotai';
import { type RefObject, useEffect, useRef } from 'react';
import { fileSidebarOpenStateAtom, mostRecentItemsAtom } from '../../atoms.ts';
import HourglassStart from '../../icons/hourglass-start.tsx';
import { AccordionItem } from '../accordion/accordion-item.tsx';
import { AccordionButton } from '../accordion/accordion-button';
import { useRecentItemFromRoute } from '../../hooks/routes.tsx';
import { motion } from 'motion/react';
import { SidebarAccordionPanel } from './sidebar-accordion-panel';
import { Folder as FolderIcon } from '../../icons/folder';
import { usePreventBoundaryOverscrollFlicker } from '../virtualized/virtualized-list/hooks.tsx';
import type { SidebarFlexWeights } from '../../atoms';
import type { FlexWeightMVs } from './index';

export function RecentAccordion({
  containerRef,
  flexWeightMVs,
  storedWeightsRef,
}: {
  containerRef: RefObject<HTMLElement | null>;
  flexWeightMVs: FlexWeightMVs;
  storedWeightsRef: RefObject<SidebarFlexWeights>;
}) {
  const [openState, setOpenState] = useAtom(fileSidebarOpenStateAtom);
  const isRecentOpen = openState.recent;
  const [mostRecentItems, setMostRecentItems] = useAtom(mostRecentItemsAtom);
  const routeItem = useRecentItemFromRoute();
  const iconSize = '1.1875rem';
  const listRef = useRef<HTMLUListElement | null>(null);
  usePreventBoundaryOverscrollFlicker({ scrollElementRef: listRef });

  // Update the "most recent items" list in the sidebar based on current route.
  // Inserts the currently viewed item at the top, maintaining list uniqueness and max length.
  useEffect(() => {
    if (!routeItem) {
      return;
    }
    setMostRecentItems((prev) => {
      const next = [
        routeItem,
        ...prev.filter((path) => path.fullPath !== routeItem.fullPath),
      ].slice(0, 10);

      const didOrderChange =
        next.length !== prev.length ||
        next.some((item, index) => item.fullPath !== prev[index]?.fullPath);

      return didOrderChange ? next : prev;
    });
  }, [routeItem, setMostRecentItems]);

  return (
    <SidebarAccordionPanel
      isOpen={isRecentOpen}
      panelKey="recent"
      containerRef={containerRef}
      flexWeightMVs={flexWeightMVs}
      storedWeightsRef={storedWeightsRef}
      trigger={
        <AccordionButton
          data-testid="recent-accordion"
          isOpen={isRecentOpen}
          onClick={() =>
            setOpenState((prev) => ({
              ...prev,
              recent: !prev.recent,
            }))
          }
          icon={
            <HourglassStart
              height={iconSize}
              width={iconSize}
              className="will-change-transform"
            />
          }
          title="Recent"
        />
      }
    >
      <ul ref={listRef} className="pl-1 overflow-y-auto grow basis-0 min-h-0">
        {mostRecentItems.length > 0 ? (
          mostRecentItems.map((recentItem) => (
            <motion.div
              key={recentItem.fullPath}
              transition={{
                layout: { type: 'spring', damping: 17, stiffness: 135 },
              }}
              layout
              layoutId={recentItem.fullPath}
              className="w-full min-w-0"
            >
              <AccordionItem
                to={
                  recentItem.type === 'folder'
                    ? recentItem.encodedFolderUrl
                    : recentItem.encodedFileUrl
                }
                itemName={
                  recentItem.type === 'folder'
                    ? recentItem.folder
                    : recentItem.note
                }
                icon={
                  recentItem.type === 'folder' ? (
                    <FolderIcon
                      className="min-w-4 min-h-4 will-change-transform"
                      height="1rem"
                      width="1rem"
                      strokeWidth={1.75}
                    />
                  ) : undefined
                }
              />
            </motion.div>
          ))
        ) : (
          <p className="pl-2 py-2 text-left list-none text-zinc-500 dark:text-zinc-300 text-xs">
            Visit a note or folder to see it here
          </p>
        )}
      </ul>
    </SidebarAccordionPanel>
  );
}
