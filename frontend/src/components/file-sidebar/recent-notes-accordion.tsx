import { useAtom } from 'jotai';
import { mostRecentNotesAtom, fileSidebarOpenStateAtom } from '../../atoms.ts';
import HourglassStart from '../../icons/hourglass-start.tsx';
import { AccordionItem } from '../accordion/accordion-item.tsx';
import { AccordionButton } from '../accordion/accordion-button';
import { AccordionButtonDivider } from './accordion-button-divider';
import { useEffect } from 'react';
import { useFilePathFromRoute } from '../../hooks/routes.tsx';
import { AnimatePresence, motion } from 'motion/react';

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
    setMostRecentNotes([routeFilePath, ...deduped].slice(0, 5));
  }, [routeFilePath, setMostRecentNotes]);

  const mostRecentElements = mostRecentNotes.map((recentNotePath) => {
    const url = recentNotePath.encodedFileUrl;
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          opacity: { duration: 0.5 },
          layout: { type: 'spring', damping: 17, stiffness: 135 },
        }}
        layout
        layoutId={recentNotePath.fullPath}
        className="w-full min-w-0"
        key={recentNotePath.fullPath}
      >
        <AccordionItem to={url} itemName={recentNotePath.note} />
      </motion.div>
    );
  });

  return (
    <section>
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
      <AccordionButtonDivider isOpen={isRecentNotesOpen} />
      <AnimatePresence initial={false}>
        {isRecentNotesOpen && (
          <motion.ul
            initial={{ height: 0 }}
            animate={{
              height: 'auto',
              transition: { type: 'spring', damping: 16 },
            }}
            exit={{ height: 0, opacity: 0 }}
            className="pl-1 overflow-hidden scrollbar-hidden"
          >
            {mostRecentElements.length > 0 ? (
              mostRecentElements
            ) : (
              <p className="pl-2 py-2 text-left list-none text-zinc-500 dark:text-zinc-300 text-xs">
                Visit a note to see it here
              </p>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}
