import { AnimatePresence, motion } from 'motion/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react';
import { useState } from 'react';
import {
  contextMenuDataAtom,
  dialogDataAtom,
  selectionRangeAtom,
} from '../../atoms';
import { useDeleteTagsMutation, useTagsQuery } from '../../hooks/tags';
import { TagIcon } from '../../icons/tag';
import TagSlash from '../../icons/tag-slash';
import { handleContextMenuSelection } from '../../utils/selection';
import {
  cn,
  getTagNameFromSelectionRange,
} from '../../utils/string-formatting';
import { Sidebar } from '../sidebar';
import { AccordionButton } from '../sidebar/accordion-button';
import { TagDialogChildren } from './tag-dialog-children';
import { navigate } from 'wouter/use-browser-location';
import {
  ROUTE_PATTERNS,
  routeUrls,
  type SavedSearchRouteParams,
} from '../../utils/routes';

import { currentZoomAtom } from '../../hooks/resize';
import { useRoute } from 'wouter';

export function MyTagsAccordion() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: tags } = useTagsQuery();
  const hasTags = tags && tags?.length > 0;
  const [isSavedSearchRoute, savedSearchRouteParams] =
    useRoute<SavedSearchRouteParams>(ROUTE_PATTERNS.SAVED_SEARCH);
  const searchQuery = savedSearchRouteParams?.searchQuery;

  return (
    <section className="pb-1.5">
      <AccordionButton
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        icon={<TagIcon width={18} height={18} strokeWidth={1.75} />}
        title={
          <>
            Tags{' '}
            {hasTags && <span className="tracking-wider">({tags.length})</span>}
          </>
        }
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{
              height: 'auto',
              transition: { type: 'spring', damping: 16 },
            }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden hover:overflow-auto pl-1"
          >
            <Sidebar<string>
              layoutId="tags-sidebar"
              emptyElement={
                <li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
                  Type #tagName in a note to create a tag
                </li>
              }
              contentType="tag"
              dataItemToString={(tagName) => tagName}
              dataItemToSelectionRangeEntry={(tagName) => tagName}
              renderLink={({ dataItem: sidebarTagName, i }) => {
                return (
                  <TagAccordionButton
                    tags={tags}
                    i={i}
                    sidebarTagName={sidebarTagName}
                    isActive={
                      isSavedSearchRoute &&
                      !!searchQuery &&
                      decodeURIComponent(searchQuery) === `#${sidebarTagName}`
                    }
                  />
                );
              }}
              data={tags ?? null}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function TagAccordionButton({
  tags,
  i,
  sidebarTagName,
  isActive,
}: {
  tags: string[] | undefined;
  i: number;
  sidebarTagName: string;
  isActive: boolean;
}) {
  const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
  const { mutateAsync: deleteTags } = useDeleteTagsMutation();

  const isSelected = tags?.at(i) && selectionRange.has(`tag:${tags[i]}`);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const setDialogData = useSetAtom(dialogDataAtom);
  const currentZoom = useAtomValue(currentZoomAtom);

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        'list-sidebar-item',
        isActive && 'bg-zinc-150 dark:bg-zinc-700',
        isSelected && 'bg-(--accent-color)! text-white'
      )}
      onClick={(e) => {
        if (e.metaKey || e.shiftKey) return;
        navigate(routeUrls.tagSearch(sidebarTagName));
      }}
      onContextMenu={(e) => {
        const newSelectionRange = handleContextMenuSelection({
          setSelectionRange,
          itemType: 'tag',
          itemName: sidebarTagName,
        });
        setContextMenuData({
          x: e.clientX / currentZoom,
          y: e.clientY / currentZoom,
          isShowing: true,
          items: [
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <TagSlash /> Delete{' '}
                  {newSelectionRange.size > 1 ? 'Tags' : 'Tag'}
                </span>
              ),
              value: 'delete-tag',
              onChange: () => {
                const tagsToDelete = Array.from(newSelectionRange).map((tag) =>
                  getTagNameFromSelectionRange(tag)
                );
                setDialogData({
                  isOpen: true,
                  isPending: false,
                  title: `Delete ${newSelectionRange.size > 1 ? 'Tags' : 'Tag'}`,
                  children: () => (
                    <TagDialogChildren tagsToDelete={newSelectionRange} />
                  ),
                  onSubmit: async (_, setErrorText) => {
                    return deleteTags({ tagsToDelete, setErrorText });
                  },
                });
              },
            },
          ],
        });
      }}
    >
      <TagIcon height={16} width={16} strokeWidth={1.75} />
      <p className="whitespace-nowrap text-ellipsis overflow-hidden">
        {sidebarTagName}{' '}
        {/* {tagPreviewCount !== undefined && (
          <span className="tracking-wider">({tagPreviewCount})</span>
        )} */}
      </p>
    </button>
  );
}
