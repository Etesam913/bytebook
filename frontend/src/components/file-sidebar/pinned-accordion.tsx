import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type { RefObject } from 'react';
import {
  contextMenuDataAtom,
  projectSettingsAtom,
  fileSidebarOpenStateAtom,
} from '@/atoms';
import { PinTack2 } from '@/icons/pin-tack-2';
import { Folder as FolderIcon } from '@/icons/folder';
import { AccordionButton } from '@components/accordion/accordion-button';
import { AccordionItem } from '@components/accordion/accordion-item';
import { VirtualizedListAccordion } from '@components/virtualized/virtualized-list/accordion';
import {
  createFilePath,
  createFolderPath,
  type FileOrFolderPath,
} from '@utils/path';
import { SidebarAccordionPanel } from './sidebar-accordion-panel';
import { useContextMenuItems } from '@components/context-menu/items';
import type { SidebarFlexWeights } from '@/atoms';
import type { FlexWeightMVs } from './index';

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
  const pinnedItems = [...pinnedNotes].reduce<FileOrFolderPath[]>(
    (acc, path) => {
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
    },
    []
  );
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const { pin } = useContextMenuItems();

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
      <VirtualizedListAccordion<FileOrFolderPath>
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
          const destinationUrl =
            pinnedItem.type === 'folder'
              ? pinnedItem.encodedFolderUrl
              : pinnedItem.encodedFileUrl;

          return (
            <AccordionItem
              onContextMenu={(e) => {
                setContextMenuData({
                  x: e.clientX,
                  y: e.clientY,
                  isShowing: true,
                  targetId: null,
                  items: [
                    pin({
                      paths: [pinnedItem.fullPath],
                      shouldPin: false,
                      kind: pinnedItem.type === 'folder' ? 'folder' : 'note',
                    }),
                  ],
                });
              }}
              key={pinnedItem.fullPath}
              to={destinationUrl}
              itemName={itemName}
              tooltipContent={pinnedItem.fullPath}
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
          );
        }}
      />
    </SidebarAccordionPanel>
  );
}
