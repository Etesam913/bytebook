import { motion } from 'motion/react';
import { useAtom } from 'jotai';
import { VirtualizedListAccordion } from '../../virtualized-list/accordion';
import { AccordionButton } from '../../accordion/accordion-button';
import {
  ROUTE_PATTERNS,
  type SavedSearchRouteParams,
} from '../../../utils/routes';
import {
  useSavedSearchesQuery,
  useSavedSearchUpdates,
} from '../../../hooks/search';

import { useRoute } from 'wouter';
import { SavedSearchAccordionButton } from './saved-search-accordion-button';
import { Box2Search } from '../../../icons/box-2-search';
import { SavedSearch } from '../../../../bindings/github.com/etesam913/bytebook/internal/search/models';
import { folderSidebarOpenStateAtom } from '../../../atoms';
import { ErrorText } from '../../error-text';
import { ArrowRotateAnticlockwise } from '../../../icons/arrow-rotate-anticlockwise';
import { Loader } from '../../../icons/loader';

export function MySavedSearchesAccordion() {
  useSavedSearchUpdates();
  const [openState, setOpenState] = useAtom(folderSidebarOpenStateAtom);
  const isOpen = openState.savedSearches;
  const {
    data: savedSearches = [],
    isError,
    isLoading,
    refetch,
  } = useSavedSearchesQuery();
  const hasSavedSearches = savedSearches.length > 0;
  const [isSavedSearchRoute, savedSearchRouteParams] =
    useRoute<SavedSearchRouteParams>(ROUTE_PATTERNS.SAVED_SEARCH);
  const searchQuery = savedSearchRouteParams?.searchQuery;

  return (
    <section className="pb-1.5">
      <AccordionButton
        data-testid="saved-searches-accordion"
        isOpen={isOpen}
        onClick={() =>
          setOpenState((prev) => ({
            ...prev,
            savedSearches: !prev.savedSearches,
          }))
        }
        icon={<Box2Search height={19} width={19} />}
        title={
          <>
            Saved Searches{' '}
            {hasSavedSearches && (
              <span className="tracking-wider">({savedSearches.length})</span>
            )}
          </>
        }
      />

      <VirtualizedListAccordion<SavedSearch>
        isOpen={isOpen}
        isError={isError}
        errorElement={
          <ErrorText
            message="Something went wrong when fetching your saved searches"
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
        layoutId="saved-searches-sidebar"
        className="scrollbar-hidden"
        emptyElement={
          <li className="text-left list-none text-zinc-500 dark:text-zinc-300 text-xs">
            No saved searches yet
          </li>
        }
        contentType="saved-search"
        dataItemToString={(search) => search.name}
        dataItemToKey={(search) => search.name}
        selectionOptions={{
          dataItemToSelectionRangeEntry: (search) => search.name,
        }}
        maxHeight="480px"
        renderItem={({ dataItem: search, i }) => (
          <SavedSearchAccordionButton
            savedSearches={savedSearches}
            i={i}
            sidebarSearchName={search.name}
            isActive={
              isSavedSearchRoute &&
              !!searchQuery &&
              decodeURIComponent(searchQuery) === search.query
            }
          />
        )}
        data={savedSearches}
      />
    </section>
  );
}
