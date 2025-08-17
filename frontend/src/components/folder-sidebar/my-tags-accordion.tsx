import { AnimatePresence, motion } from 'motion/react';
import { useSetAtom } from 'jotai/react';
import { useState } from 'react';
import { useRoute } from 'wouter';
import { contextMenuDataAtom, dialogDataAtom } from '../../atoms';
import { useDeleteTagsMutation } from '../../hooks/notes';
import { useTagsQuery } from '../../hooks/tags';
import { TagIcon } from '../../icons/tag';
import TagSlash from '../../icons/tag-slash';
import { handleContextMenuSelection } from '../../utils/selection';
import { cn } from '../../utils/string-formatting';
import { Sidebar } from '../sidebar';
import { AccordionButton } from '../sidebar/accordion-button';
import { TagDialogChildren } from './tag-dialog-children';
import { navigate } from 'wouter/use-browser-location';
import { useQuery } from '@tanstack/react-query';
import { CURRENT_ZOOM } from '../../hooks/resize';

export function MyTagsAccordion() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: tags } = useTagsQuery();
  const hasTags = tags && tags?.length > 0;
  const [, params] = useRoute('/tags/:tagName/:folder?/:note?');
  const tagNameFromUrl = (params as { tagName: string })?.tagName;

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
            <Sidebar
              layoutId="tags-sidebar"
              emptyElement={
                <li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
                  Type #tagName in a note to create a tag
                </li>
              }
              contentType="tag"
              renderLink={({
                dataItem: sidebarTagName,
                i,
                selectionRange,
                setSelectionRange,
              }) => {
                return (
                  <TagAccordionButton
                    tags={tags}
                    i={i}
                    selectionRange={selectionRange}
                    setSelectionRange={setSelectionRange}
                    sidebarTagName={sidebarTagName}
                    tagNameFromUrl={tagNameFromUrl}
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
  selectionRange,
  setSelectionRange,
  sidebarTagName,
  tagNameFromUrl,
}: {
  tags: string[] | undefined;
  i: number;
  selectionRange: Set<string>;
  setSelectionRange: React.Dispatch<React.SetStateAction<Set<string>>>;
  sidebarTagName: string;
  tagNameFromUrl: string | undefined;
}) {
  const { mutateAsync: deleteTags } = useDeleteTagsMutation();
  const isActive = decodeURIComponent(tagNameFromUrl ?? '') === sidebarTagName;
  const isSelected = tags?.at(i) && selectionRange.has(`tag:${tags[i]}`);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const setDialogData = useSetAtom(dialogDataAtom);

  // const { data: tagPreview } = useQuery({
  //   queryKey: ['tag-preview', sidebarTagName],
  //   queryFn: () => GetPreviewForTag(sidebarTagName),
  // });

  // const tagPreviewCount = tagPreview?.data?.count;

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
        navigate(`/tags/${encodeURIComponent(sidebarTagName)}`);
      }}
      onContextMenu={(e) => {
        const newSelectionRange = handleContextMenuSelection({
          setSelectionRange,
          itemType: 'tag',
          itemName: sidebarTagName,
        });
        setContextMenuData({
          x: e.clientX / CURRENT_ZOOM,
          y: e.clientY / CURRENT_ZOOM,
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
                setDialogData({
                  isOpen: true,
                  isPending: false,
                  title: `Delete ${newSelectionRange.size > 1 ? 'Tags' : 'Tag'}`,
                  children: () => (
                    <TagDialogChildren tagsToDelete={newSelectionRange} />
                  ),
                  onSubmit: async () => {
                    return deleteTags({ tagsToDelete: newSelectionRange });
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
