import { useProjectSettingsQuery } from '@hooks/project-settings';
import { useAllPaths } from '@hooks/all-paths';
import { useAtom, useSetAtom } from 'jotai';
import type { RefObject } from 'react';
import { contextMenuDataAtom, fileSidebarOpenStateAtom } from '@/atoms';
import { PinTack2 } from '@/icons/pin-tack-2';
import { Folder as FolderIcon } from '@/icons/folder';
import { RenderNoteIcon } from '@/icons/render-note-icon';
import type { SidebarReorderOptions } from '@/types';
import { AccordionItem } from '@components/accordion/accordion-item';
import { SidebarListAccordion } from '@components/file-sidebar/sidebar-list/accordion';
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
  reorderOptions,
}: {
  containerRef: RefObject<HTMLElement | null>;
  flexWeightMVs: FlexWeightMVs;
  storedWeightsRef: RefObject<SidebarFlexWeights>;
  reorderOptions: SidebarReorderOptions;
}) {
  const [openState, setOpenState] = useAtom(fileSidebarOpenStateAtom);
  const isPinnedOpen = openState.pinned;

  const {
    data: { pinnedNotes },
  } = useProjectSettingsQuery();
  const { data: allPaths } = useAllPaths();
  const folderPaths = new Set(allPaths?.filter((path) => path.endsWith('/')));
  const pinnedItems = [...pinnedNotes].reduce<FileOrFolderPath[]>(
    (acc, path) => {
      // Settings omit the folder marker, so resolve folders from the tree snapshot.
      const folderPath = createFolderPath(path);
      if (
        folderPath &&
        (path.endsWith('/') || folderPaths.has(folderPath.fullPath))
      ) {
        acc.push(folderPath);
        return acc;
      }

      const filePath = createFilePath(path);
      if (filePath) {
        acc.push(filePath);
        return acc;
      }

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
      reorderOptions={reorderOptions}
      trigger={{
        'data-testid': 'pinned-accordion',
        onPress: () =>
          setOpenState((prev) => ({
            ...prev,
            pinned: !prev.pinned,
          })),
        icon: (
          <PinTack2
            className="will-change-transform"
            width="1.25rem"
            height="1.25rem"
          />
        ),
        title: `Pinned (${pinnedItems.length})`,
      }}
    >
      <SidebarListAccordion<FileOrFolderPath>
        contentType="pinned-note"
        data={pinnedItems}
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
                ) : (
                  <RenderNoteIcon
                    filePath={pinnedItem}
                    size="sm"
                    className="will-change-transform"
                  />
                )
              }
            />
          );
        }}
      />
    </SidebarAccordionPanel>
  );
}
