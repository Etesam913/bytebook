import { AnimatePresence, motion } from 'motion/react';
import { useAtom } from 'jotai';
import { useTagsQuery } from '../../../hooks/tags';
import { TagIcon } from '../../../icons/tag';
import { Loader } from '../../../icons/loader';
import { VirtualizedList } from '../../virtualized-list';
import { AccordionButton } from '../../accordion/accordion-button';
import {
  ROUTE_PATTERNS,
  type SavedSearchRouteParams,
} from '../../../utils/routes';

import { useRoute } from 'wouter';
import { TagAccordionButton } from './tag-accordion-button';
import { folderSidebarOpenStateAtom } from '../../../atoms';
import { ErrorText } from '../../error-text';
import { RefreshAnticlockwise } from '../../../icons/refresh-anticlockwise';

export function MyTagsAccordion() {
  const [openState, setOpenState] = useAtom(folderSidebarOpenStateAtom);
  const isOpen = openState.tags;
  const { data: tags, isError, isLoading, refetch } = useTagsQuery();
  const hasTags = tags && tags?.length > 0;
  const [isSavedSearchRoute, savedSearchRouteParams] =
    useRoute<SavedSearchRouteParams>(ROUTE_PATTERNS.SAVED_SEARCH);
  const searchQuery = savedSearchRouteParams?.searchQuery;

  return (
    <section>
      <AccordionButton
        data-testid="tags-accordion"
        isOpen={isOpen}
        onClick={() =>
          setOpenState((prev) => ({
            ...prev,
            tags: !prev.tags,
          }))
        }
        icon={<TagIcon width={18} height={18} strokeWidth={1.75} />}
        title={
          <>
            Tags{' '}
            {hasTags && <span className="tracking-wider">({tags.length})</span>}
          </>
        }
      />

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{
              height: 480,
              transition: { type: 'spring', damping: 16 },
            }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden hover:overflow-auto pl-1"
          >
            {isError && (
              <ErrorText
                message="Something went wrong when fetching your tags"
                onRetry={() => refetch()}
                icon={
                  <RefreshAnticlockwise
                    className="will-change-transform"
                    width={12}
                    height={12}
                  />
                }
              />
            )}
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <Loader width={20} height={20} className="mx-auto my-3" />
              </motion.div>
            ) : (
              <VirtualizedList<string>
                layoutId="tags-sidebar"
                emptyElement={
                  <li className="text-left list-none text-zinc-500 dark:text-zinc-300 text-xs">
                    Type #tagName in a note to create a tag
                  </li>
                }
                contentType="tag"
                dataItemToString={(tagName) => tagName}
                dataItemToKey={(tagName) => tagName}
                selectionOptions={{
                  dataItemToSelectionRangeEntry: (tagName) => tagName,
                }}
                maxHeight={480}
                renderItem={({ dataItem: sidebarTagName, i }) => (
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
                )}
                data={tags ?? null}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
