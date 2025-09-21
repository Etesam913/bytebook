import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useRoute } from 'wouter';
import { useTagsQuery } from '../../../hooks/tags';
import { TagIcon } from '../../../icons/tag';
import { Sidebar } from '../../sidebar';
import { AccordionButton } from '../../sidebar/accordion-button';
import { TagAccordionButton } from './button';

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

