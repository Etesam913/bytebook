import { useAtom } from 'jotai';
import { mostRecentNotesAtom, fileSidebarOpenStateAtom } from '../../atoms.ts';
import HourglassStart from '../../icons/hourglass-start.tsx';
import { AccordionItem } from '../accordion/accordion-item.tsx';
import { AccordionButton } from '../accordion/accordion-button';
import { useEffect } from 'react';
import { useFilePathFromRoute } from '../../hooks/routes.tsx';
import { motion } from 'motion/react';
import { SidebarAccordionPanel } from './sidebar-accordion-panel';

export function RecentNotesAccordion() {
  const [openState, setOpenState] = useAtom(fileSidebarOpenStateAtom);
  const isRecentNotesOpen = openState.recentNotes;
  const [mostRecentNotes, setMostRecentNotes] = useAtom(mostRecentNotesAtom);
  const routeFilePath = useFilePathFromRoute();

  useEffect(() => {
    if (!routeFilePath) {
      return;
    }
    const deduped = mostRecentNotes.filter(
      (path) => !path.equals(routeFilePath)
    );
    setMostRecentNotes([routeFilePath, ...deduped].slice(0, 10));
  }, [routeFilePath, setMostRecentNotes]);

  return (
    <SidebarAccordionPanel isOpen={isRecentNotesOpen}>
      <AccordionButton
        data-testid="recent-notes-accordion"
        isOpen={isRecentNotesOpen}
        onClick={() =>
          setOpenState((prev) => ({
            ...prev,
            recentNotes: !prev.recentNotes,
          }))
        }
        icon={
          <HourglassStart
            height={19}
            width={19}
            className="will-change-transform"
          />
        }
        title="Recent Notes"
      />
      <ul className="pl-1 overflow-y-auto scrollbar-hidden grow basis-0 min-h-0">
        {mostRecentNotes.length > 0 ? (
          mostRecentNotes.map((recentNotePath) => (
            <motion.div
              key={recentNotePath.fullPath}
              transition={{
                layout: { type: 'spring', damping: 17, stiffness: 135 },
              }}
              layout
              layoutId={recentNotePath.fullPath}
              className="w-full min-w-0"
            >
              <AccordionItem
                to={recentNotePath.encodedFileUrl}
                itemName={recentNotePath.note}
              />
            </motion.div>
          ))
        ) : (
          <p className="pl-2 py-2 text-left list-none text-zinc-500 dark:text-zinc-300 text-xs">
            Visit a note to see it here
          </p>
        )}
      </ul>
    </SidebarAccordionPanel>
  );
}
