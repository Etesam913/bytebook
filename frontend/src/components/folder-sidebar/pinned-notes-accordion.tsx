import { AnimatePresence, motion } from 'motion/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  contextMenuDataAtom,
  projectSettingsAtom,
  folderSidebarOpenStateAtom,
} from '../../atoms';
import { usePinNotesMutation } from '../../hooks/notes';
import { PinTack2 } from '../../icons/pin-tack-2';
import { PinTackSlash } from '../../icons/pin-tack-slash';
import { AccordionButton } from '../accordion/accordion-button';
import { AccordionItem } from '../accordion/accordion-item';
import { VirtualizedList } from '../virtualized-list';
import { currentZoomAtom } from '../../hooks/resize';
import { LocalFilePath } from '../../utils/path';

function VirtualizedPinnedNotes() {
  const projectSettings = useAtomValue(projectSettingsAtom);
  const pinnedNotes = projectSettings.pinnedNotes;
  const pinnedNotesPaths = [...pinnedNotes]
    .filter((folderAndNotes) => folderAndNotes.split('/').length === 2)
    .map((folderAndNote) => {
      const segments = folderAndNote.split('/');
      return new LocalFilePath({ folder: segments[0], note: segments[1] });
    });
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const currentZoom = useAtomValue(currentZoomAtom);
  const { mutate: pinOrUnpinNote } = usePinNotesMutation();

  return (
    <motion.div
      className="overflow-hidden hover:overflow-y-auto max-h-60"
      initial={{ height: 0 }}
      animate={{
        height: 'auto',
        transition: { type: 'spring', damping: 16 },
      }}
      exit={{ height: 0, opacity: 0 }}
    >
      <VirtualizedList<LocalFilePath>
        contentType="note"
        layoutId="pinned-notes"
        data={pinnedNotesPaths}
        dataItemToString={(filePath) => filePath.note}
        dataItemToKey={(filePath) => filePath.toString()}
        selectionOptions={{
          dataItemToSelectionRangeEntry: (filePath) => filePath.note,
        }}
        shouldHideSidebarHighlight
        maxHeight={240}
        emptyElement={
          <li className="pl-2 text-balance list-none text-zinc-500 dark:text-zinc-300 text-xs py-2">
            No pinned notes. Right click a note to open the context menu and pin
            it.
          </li>
        }
        renderItem={({ dataItem: pinnedNotePath }) => {
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
                          selectionRange: new Set([
                            `note:${pinnedNotePath.note}`,
                          ]),
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
        }}
      />
    </motion.div>
  );
}

export function PinnedNotesAccordion() {
  const [openState, setOpenState] = useAtom(folderSidebarOpenStateAtom);
  const isPinnedNotesOpen = openState.pinnedNotes;

  return (
    <section>
      <AccordionButton
        data-testid="pinned-notes-accordion"
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
        {isPinnedNotesOpen && <VirtualizedPinnedNotes />}
      </AnimatePresence>
    </section>
  );
}
