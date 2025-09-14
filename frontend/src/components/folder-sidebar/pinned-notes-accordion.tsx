import { AnimatePresence, motion } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useRef, useState } from 'react';
import {
  contextMenuDataAtom,
  projectSettingsAtom,
  projectSettingsWithQueryParamsAtom,
} from '../../atoms';
import { usePinNotesMutation } from '../../hooks/notes';
import { useListVirtualization } from '../../hooks/observers';
import { PinTack2 } from '../../icons/pin-tack-2';
import { PinTackSlash } from '../../icons/pin-tack-slash';
import { AccordionButton } from '../sidebar/accordion-button';
import { AccordionItem } from '../sidebar/accordion-item';
import { currentZoomAtom } from '../../hooks/resize';

const SIDEBAR_ITEM_HEIGHT = 28;

function VirtualizedPinnedNotes({
  isPinnedNotesOpen,
}: {
  isPinnedNotesOpen: boolean;
}) {
  const projectSettings = useAtomValue(projectSettingsAtom);
  const pinnedNotes = projectSettings.pinnedNotes;
  const projectSettingsWithQueryParams = useAtomValue(
    projectSettingsWithQueryParamsAtom
  );
  const listScrollContainerRef = useRef<HTMLDivElement>(null);
  const pinnedNotesArray = Array.from(pinnedNotes);
  const pinnedNotesWithQueryParamsArray = Array.from(
    projectSettingsWithQueryParams.pinnedNotes
  );
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const currentZoom = useAtomValue(currentZoomAtom);

  const {
    visibleItems,
    onScroll,
    outerContainerStyle,
    innerContainerStyle,
    startIndex,
  } = useListVirtualization<string>({
    items: pinnedNotesArray,
    itemHeight: SIDEBAR_ITEM_HEIGHT,
    listRef: listScrollContainerRef,
  });
  const { mutate: pinOrUnpinNote } = usePinNotesMutation();

  const pinnedNotesElements = visibleItems.map((pinnedNote, i) => {
    const [folderName, noteName] = pinnedNote.split('/');
    if (!noteName) return null;
    const itemsIndex = startIndex + i;
    const url = pinnedNotesWithQueryParamsArray[itemsIndex];
    const noteNameWithQueryParams = pinnedNotesWithQueryParamsArray[itemsIndex]
      .split('/')
      .pop();
    return (
      <AccordionItem
        onContextMenu={(e) => {
          setContextMenuData({
            x: e.clientX / currentZoom,
            y: e.clientY / currentZoom,
            isShowing: true,
            items: [
              {
                label: (
                  <span className="flex items-center gap-1.5">
                    <PinTackSlash
                      width={17}
                      height={17}
                      className="will-change-transform"
                    />{' '}
                    Unpin Note
                  </span>
                ),
                value: 'unpin-note',
                onChange: () =>
                  pinOrUnpinNote({
                    folder: folderName,
                    selectionRange: new Set([
                      `note:${noteNameWithQueryParams}`,
                    ]),
                    shouldPin: false,
                  }),
              },
            ],
          });
        }}
        key={url}
        to={url}
        itemName={noteName}
      />
    );
  });

  return (
    <motion.div
      className="overflow-hidden hover:overflow-y-auto max-h-[15rem]"
      ref={listScrollContainerRef}
      onScroll={onScroll}
      initial={{ height: 0 }}
      animate={{
        height: 'auto',
        transition: { type: 'spring', damping: 16 },
      }}
      exit={{ height: 0, opacity: 0 }}
    >
      <div
        style={{
          ...outerContainerStyle,
        }}
      >
        <ul
          style={{
            ...innerContainerStyle,
          }}
        >
          {isPinnedNotesOpen && pinnedNotesElements.length > 0 ? (
            pinnedNotesElements
          ) : (
            <li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
              No pinned notes. Right click a note to open the context menu and
              pin it.
            </li>
          )}
        </ul>
      </div>
    </motion.div>
  );
}

export function PinnedNotesAccordion() {
  const [isPinnedNotesOpen, setIsPinnedNotesOpen] = useState(true);

  return (
    <section>
      <AccordionButton
        onClick={() => setIsPinnedNotesOpen((prev) => !prev)}
        icon={<PinTack2 className="will-change-transform" />}
        title="Pinned Notes"
        isOpen={isPinnedNotesOpen}
      />
      <AnimatePresence>
        {isPinnedNotesOpen && (
          <VirtualizedPinnedNotes isPinnedNotesOpen={isPinnedNotesOpen} />
        )}
      </AnimatePresence>
    </section>
  );
}
