import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  contextMenuDataAtom,
  projectSettingsAtom,
  fileSidebarOpenStateAtom,
} from '../../atoms';
import { usePinPathMutation } from '../../hooks/notes';
import { PinTack2 } from '../../icons/pin-tack-2';
import { PinTackSlash } from '../../icons/pin-tack-slash';
import { AccordionButton } from '../accordion/accordion-button';
import { AccordionItem } from '../accordion/accordion-item';
import { VirtualizedListAccordion } from '../virtualized/virtualized-list/accordion';
import { currentZoomAtom } from '../../hooks/resize';
import { createFilePath, type FilePath } from '../../utils/path';
import { Tooltip } from '../tooltip';

export function PinnedNotesAccordion() {
  const [openState, setOpenState] = useAtom(fileSidebarOpenStateAtom);
  const isPinnedNotesOpen = openState.pinnedNotes;

  const projectSettings = useAtomValue(projectSettingsAtom);
  const pinnedNotes = projectSettings.pinnedNotes;
  const pinnedNotesPaths = [...pinnedNotes]
    .map((path) => createFilePath(path))
    .filter((pinnedPath): pinnedPath is FilePath => pinnedPath !== null);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const currentZoom = useAtomValue(currentZoomAtom);
  const { mutate: pinOrUnpinPath } = usePinPathMutation();

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
      <VirtualizedListAccordion<FilePath>
        isOpen={isPinnedNotesOpen}
        contentType="pinned-note"
        layoutId="pinned-notes"
        data={pinnedNotesPaths}
        dataItemToString={(pinnedPath) => pinnedPath.note}
        dataItemToKey={(pinnedPath) => pinnedPath.fullPath}
        selectionOptions={{
          dataItemToSelectionRangeEntry: (pinnedPath) => pinnedPath.note,
        }}
        maxHeight="240px"
        emptyElement={
          <li className="pl-2 text-balance list-none text-zinc-500 dark:text-zinc-300 text-xs py-2">
            No pinned notes. Right click a note to open the context menu and pin
            it.
          </li>
        }
        renderItem={({ dataItem: pinnedNotePath }) => {
          return (
            <Tooltip placement="right" content={pinnedNotePath.fullPath}>
              <div className="w-full min-w-0">
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
                            pinOrUnpinPath({
                              path: pinnedNotePath.fullPath,
                              shouldPin: false,
                            }),
                        },
                      ],
                    });
                  }}
                  key={pinnedNotePath.fullPath}
                  to={pinnedNotePath.encodedFileUrl}
                  itemName={pinnedNotePath.note}
                />
              </div>
            </Tooltip>
          );
        }}
      />
    </section>
  );
}
