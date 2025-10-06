import { useAtom } from 'jotai';
import { mostRecentNotesAtom, folderSidebarOpenStateAtom } from '../../atoms';
import HourglassStart from '../../icons/hourglass-start.tsx';
import { AccordionItem } from '../sidebar/accordion-item.tsx';
import { SidebarAccordion } from '../sidebar/accordion.tsx';

export function RecentNotesAccordion() {
  const [openState, setOpenState] = useAtom(folderSidebarOpenStateAtom);
  const isRecentNotesOpen = openState.recentNotes;
  const [mostRecentNotes] = useAtom(mostRecentNotesAtom);

  const mostRecentElements = mostRecentNotes.map((recentNotePath) => {
    const url = recentNotePath.getLinkToNote();
    return (
      <AccordionItem
        key={recentNotePath.toString()}
        to={url}
        itemName={recentNotePath.note}
      />
    );
  });

  if (mostRecentNotes.length === 0) {
    return <></>;
  }

  return (
    <SidebarAccordion
      onClick={() =>
        setOpenState((prev) => ({
          ...prev,
          recentNotes: !prev.recentNotes,
        }))
      }
      title="Recent Notes"
      isOpen={isRecentNotesOpen}
      icon={
        <HourglassStart
          height={19}
          width={19}
          className="will-change-transform"
        />
      }
    >
      {mostRecentElements.length > 0 ? (
        mostRecentElements
      ) : (
        <p className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
          Visit a note to see it here
        </p>
      )}
    </SidebarAccordion>
  );
}
