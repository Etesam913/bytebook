import { motion } from 'motion/react';
import { useAtom } from 'jotai';
import { useTagsQuery } from '../../../hooks/tags';
import { TagIcon } from '../../../icons/tag';
import { Loader } from '../../../icons/loader';
import { VirtualizedListAccordion } from '../../virtualized/virtualized-list/accordion';
import { AccordionButton } from '../../accordion/accordion-button';
import {
  ROUTE_PATTERNS,
  type SavedSearchRouteParams,
} from '../../../utils/routes';

import { useRoute } from 'wouter';
import { TagAccordionButton } from './tag-accordion-button';
import { fileSidebarOpenStateAtom } from '../../../atoms';
import { ErrorText } from '../../error-text';
import { ArrowRotateAnticlockwise } from '../../../icons/arrow-rotate-anticlockwise';

export function MyTagsAccordion() {
  const [openState, setOpenState] = useAtom(fileSidebarOpenStateAtom);
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

      <VirtualizedListAccordion<string>
        isOpen={isOpen}
        isError={isError}
        errorElement={
          <ErrorText
            message="Something went wrong when fetching your tags"
            onRetry={() => refetch()}
            icon={
              <ArrowRotateAnticlockwise
                className="will-change-transform"
                width={12}
                height={12}
              />
            }
          />
        }
        isLoading={isLoading}
        loadingElement={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <Loader width={20} height={20} className="mx-auto my-3" />
          </motion.div>
        }
        layoutId="tags-sidebar"
        className="scrollbar-hidden"
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
        maxHeight="480px"
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
    </section>
  );
}
