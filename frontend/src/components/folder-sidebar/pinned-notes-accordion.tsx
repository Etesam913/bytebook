import { AnimatePresence, motion } from 'motion/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useRef } from 'react';
import {
  contextMenuDataAtom,
  projectSettingsAtom,
  folderSidebarOpenStateAtom,
} from '../../atoms';
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

  const isEmpty = pinnedNotesPaths.length === 0;

  return (
    <motion.div
      className="overflow-hidden hover:overflow-y-auto max-h-60"
      ref={listScrollContainerRef}
      onScroll={onScroll}
      initial={{ height: 0 }}
      animate={{
        height: 'auto',
        transition: { type: 'spring', damping: 16 },
      }}
      exit={{ height: 0, opacity: 0 }}
    >
      <div style={isEmpty ? undefined : { ...outerContainerStyle }}>
        <ul style={isEmpty ? undefined : { ...innerContainerStyle }}>
          {isPinnedNotesOpen && pinnedNotesElements.length > 0 ? (
            pinnedNotesElements
          ) : (
            <li className="pl-2 text-balance list-none text-zinc-500 dark:text-zinc-300 text-xs py-2">
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
  const [openState, setOpenState] = useAtom(folderSidebarOpenStateAtom);
  const isPinnedNotesOpen = openState.pinnedNotes;

  return (
    <section>
      <AccordionButton
        onClick={() =>
          setOpenState((prev) => ({
            ...prev,
            pinnedNotes: !prev.pinnedNotes,
          }))
        }
        icon={<PinTack2 className="will-change-transform" />}
        title="Pinned Notes"
        isOpen={isPinnedNotesOpen}
      />
      <AnimatePresence initial={false}>
        {isPinnedNotesOpen && (
          <VirtualizedPinnedNotes isPinnedNotesOpen={isPinnedNotesOpen} />
        )}
      </AnimatePresence>
    </section>
  );
}
