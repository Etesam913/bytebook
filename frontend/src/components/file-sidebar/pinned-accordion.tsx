import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type { RefObject } from 'react';
import {
  contextMenuDataAtom,
  projectSettingsAtom,
  fileSidebarOpenStateAtom,
} from '../../atoms';
import { usePinPathMutation } from '../../hooks/notes';
import { PinTack2 } from '../../icons/pin-tack-2';
import { PinTackSlash } from '../../icons/pin-tack-slash';
import { Folder as FolderIcon } from '../../icons/folder';
import { AccordionButton } from '../accordion/accordion-button';
import { AccordionItem } from '../accordion/accordion-item';
import { VirtualizedListAccordion } from '../virtualized/virtualized-list/accordion';
import {
  createFilePath,
  createFolderPath,
  type FilePath,
  type FolderPath,
} from '../../utils/path';
import { Tooltip } from '../tooltip';
import { SidebarAccordionPanel } from './sidebar-accordion-panel';
import type { SidebarFlexWeights } from '../../atoms';
import type { FlexWeightMVs } from './index';

type PinnedItem = FilePath | FolderPath;

export function PinnedAccordion({
  containerRef,
  flexWeightMVs,
  storedWeightsRef,
}: {
  containerRef: RefObject<HTMLElement | null>;
  flexWeightMVs: FlexWeightMVs;
  storedWeightsRef: RefObject<SidebarFlexWeights>;
}) {
  const [openState, setOpenState] = useAtom(fileSidebarOpenStateAtom);
  const isPinnedOpen = openState.pinned;

  const projectSettings = useAtomValue(projectSettingsAtom);
  const pinnedNotes = projectSettings.pinnedNotes;
  const pinnedItems = [...pinnedNotes].reduce<PinnedItem[]>((acc, path) => {
    const filePath = createFilePath(path);
    if (filePath) {
      acc.push(filePath);
      return acc;
    }

    const folderPath = createFolderPath(path);
    if (folderPath) {
      acc.push(folderPath);
    }

    return acc;
  }, []);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const { mutate: pinOrUnpinPath } = usePinPathMutation();

  return (
    <SidebarAccordionPanel
      isOpen={isPinnedOpen}
      panelKey="pinned"
      containerRef={containerRef}
      flexWeightMVs={flexWeightMVs}
      storedWeightsRef={storedWeightsRef}
      trigger={
        <AccordionButton
          data-testid="pinned-accordion"
          onClick={() =>
            setOpenState((prev) => ({
              ...prev,
              pinned: !prev.pinned,
            }))
          }
          icon={
            <PinTack2
              className="will-change-transform"
              width="1.25rem"
              height="1.25rem"
            />
          }
          title="Pinned"
          isOpen={isPinnedOpen}
        />
      }
    >
      <VirtualizedListAccordion<PinnedItem>
        contentType="pinned-note"
        layoutId="pinned-notes"
        data={pinnedItems}
        dataItemToString={(pinnedItem) =>
          pinnedItem.type === 'file' ? pinnedItem.note : pinnedItem.folder
        }
        dataItemToKey={(pinnedItem) => pinnedItem.fullPath}
        selectionOptions={{
          dataItemToSelectionRangeEntry: (pinnedItem) => pinnedItem.fullPath,
        }}
        emptyElement={
          <li className="pl-2 list-none text-zinc-500 dark:text-zinc-300 text-xs py-2">
            No pinned items. Right click a note or folder to open the context
            menu and pin it.
          </li>
        }
        renderItem={({ dataItem: pinnedItem }) => {
          const itemName =
            pinnedItem.type === 'folder' ? pinnedItem.folder : pinnedItem.note;
          const unpinLabel =
            pinnedItem.type === 'folder' ? 'Unpin Folder' : 'Unpin Note';
          const destinationUrl =
            pinnedItem.type === 'folder'
              ? pinnedItem.encodedFolderUrl
              : pinnedItem.encodedFileUrl;

          return (
            <Tooltip placement="right" content={pinnedItem.fullPath}>
              <div className="w-full min-w-0">
                <AccordionItem
                  onContextMenu={(e) => {
                    setContextMenuData({
                      x: e.clientX,
                      y: e.clientY,
                      isShowing: true,
                      targetId: null,
                      items: [
                        {
                          label: (
                            <span className="flex items-center gap-1.5">
                              <PinTackSlash
                                width="1.0625rem"
                                height="1.0625rem"
                                className="will-change-transform"
                              />
                              {unpinLabel}
                            </span>
                          ),
                          value: 'unpin-note',
                          onChange: () =>
                            pinOrUnpinPath({
                              path: pinnedItem.fullPath,
                              shouldPin: false,
                            }),
                        },
                      ],
                    });
                  }}
                  key={pinnedItem.fullPath}
                  to={destinationUrl}
                  itemName={itemName}
                  icon={
                    pinnedItem.type === 'folder' ? (
                      <FolderIcon
                        className="min-w-4 min-h-4 will-change-transform"
                        height="1rem"
                        width="1rem"
                        strokeWidth={1.75}
                      />
                    ) : undefined
                  }
                />
              </div>
            </Tooltip>
          );
        }}
      />
    </SidebarAccordionPanel>
  );
}
