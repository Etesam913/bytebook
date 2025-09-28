import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { mostRecentNotesAtom } from '../../atoms';
import HourglassStart from '../../icons/hourglass-start.tsx';
import { AccordionItem } from '../sidebar/accordion-item.tsx';
import { SidebarAccordion } from '../sidebar/accordion.tsx';

export function RecentNotesAccordion() {
  const [isRecentNotesOpen, setIsRecentNotesOpen] = useState(false);
  const mostRecentNotes = useAtomValue(mostRecentNotesAtom);

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
      onClick={() => setIsRecentNotesOpen((prev) => !prev)}
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
