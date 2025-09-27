import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Magnifier } from '../../../icons/magnifier';
import { Sidebar } from '../../sidebar';
import { AccordionButton } from '../../sidebar/accordion-button';
import {
  ROUTE_PATTERNS,
  type SavedSearchRouteParams,
} from '../../../utils/routes';

import { useRoute } from 'wouter';
import { SavedSearchAccordionButton } from './saved-search-accordion-button';
import { Box2Search } from '../../../icons/box-2-search';

export function MySavedSearchesAccordion() {
  const [isOpen, setIsOpen] = useState(false);
  // TODO: Replace with actual saved searches hook when implemented
  const savedSearches = []; // Placeholder for saved searches data
  const hasSavedSearches = savedSearches && savedSearches?.length > 0;
  const [isSavedSearchRoute, savedSearchRouteParams] =
    useRoute<SavedSearchRouteParams>(ROUTE_PATTERNS.SAVED_SEARCH);
  const searchQuery = savedSearchRouteParams?.searchQuery;

  return (
    <section className="pb-1.5">
      <AccordionButton
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
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
              layoutId="saved-searches-sidebar"
              emptyElement={
                <li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
                  No saved searches yet
                </li>
              }
              contentType="saved-search"
              dataItemToString={(searchName) => searchName}
              dataItemToSelectionRangeEntry={(searchName) => searchName}
              renderLink={({ dataItem: sidebarSearchName, i }) => {
                return (
                  <SavedSearchAccordionButton
                    savedSearches={savedSearches}
                    i={i}
                    sidebarSearchName={sidebarSearchName}
                    isActive={
                      isSavedSearchRoute &&
                      !!searchQuery &&
                      decodeURIComponent(searchQuery) === sidebarSearchName
                    }
                  />
                );
              }}
              data={savedSearches ?? null}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
