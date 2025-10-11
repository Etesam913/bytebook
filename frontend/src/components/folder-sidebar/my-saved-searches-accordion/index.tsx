import { AnimatePresence, motion } from 'motion/react';
import { useAtom } from 'jotai';
import { Sidebar } from '../../sidebar';
import { AccordionButton } from '../../sidebar/accordion-button';
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

export function MySavedSearchesAccordion() {
  useSavedSearchUpdates();
  const [openState, setOpenState] = useAtom(folderSidebarOpenStateAtom);
  const isOpen = openState.savedSearches;
  const { data: savedSearches = [] } = useSavedSearchesQuery();
  const hasSavedSearches = savedSearches.length > 0;
  const [isSavedSearchRoute, savedSearchRouteParams] =
    useRoute<SavedSearchRouteParams>(ROUTE_PATTERNS.SAVED_SEARCH);
  const searchQuery = savedSearchRouteParams?.searchQuery;

  return (
    <section className="pb-1.5">
      <AccordionButton
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

      <AnimatePresence initial={false}>
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
            <Sidebar<SavedSearch>
              layoutId="saved-searches-sidebar"
              emptyElement={
                <li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
                  No saved searches yet
                </li>
              }
              contentType="saved-search"
              dataItemToString={(search) => search.name}
              dataItemToKey={(search) => search.name}
              dataItemToSelectionRangeEntry={(search) => search.name}
              renderLink={({ dataItem: search, i }) => {
                return (
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
                );
              }}
              data={savedSearches}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
