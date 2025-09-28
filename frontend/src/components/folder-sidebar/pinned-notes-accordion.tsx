import { AnimatePresence, motion } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useRef, useState } from 'react';
import { contextMenuDataAtom, projectSettingsAtom } from '../../atoms';
import { usePinNotesMutation } from '../../hooks/notes';
import { useListVirtualization } from '../../hooks/observers';
import { PinTack2 } from '../../icons/pin-tack-2';
import { PinTackSlash } from '../../icons/pin-tack-slash';
import { AccordionButton } from '../sidebar/accordion-button';
import { AccordionItem } from '../sidebar/accordion-item';
import { currentZoomAtom } from '../../hooks/resize';
import { FilePath } from '../../utils/string-formatting';

const SIDEBAR_ITEM_HEIGHT = 28;

function VirtualizedPinnedNotes({
  isPinnedNotesOpen,
}: {
  isPinnedNotesOpen: boolean;
}) {
  const projectSettings = useAtomValue(projectSettingsAtom);
  const pinnedNotes = projectSettings.pinnedNotes;
  const listScrollContainerRef = useRef<HTMLDivElement>(null);
  const pinnedNotesPaths = [...pinnedNotes]
    .filter((folderAndNotes) => folderAndNotes.split('/').length === 2)
    .map((folderAndNote) => {
      const segments = folderAndNote.split('/');
      return new FilePath({ folder: segments[0], note: segments[1] });
    });
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const currentZoom = useAtomValue(currentZoomAtom);

  const { visibleItems, onScroll, outerContainerStyle, innerContainerStyle } =
    useListVirtualization<FilePath>({
      items: pinnedNotesPaths,
      itemHeight: SIDEBAR_ITEM_HEIGHT,
      listRef: listScrollContainerRef,
    });
  const { mutate: pinOrUnpinNote } = usePinNotesMutation();

  const pinnedNotesElements = visibleItems.map((pinnedNotePath) => {
    const url = pinnedNotePath.getLinkToNote();
    console.log('url', url);
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
                    folder: pinnedNotePath.folder,
                    selectionRange: new Set([`note:${pinnedNotePath.note}`]),
                    shouldPin: false,
                  }),
              },
            ],
          });
        }}
        key={pinnedNotePath.toString()}
        to={url}
        itemName={pinnedNotePath.note}
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
