import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { useFolders } from '../../../hooks/folders';
import { Folder } from '../../../icons/folder';
import { AccordionButton } from '../../accordion/accordion-button';
import { navigate } from 'wouter/use-browser-location';
import { useLocation } from 'wouter';
import { routeUrls } from '../../../utils/routes';
import { useFolderFromRoute } from '../../../hooks/events';
import { findClosestSidebarItemToNavigateTo } from '../../../utils/routing';
import { folderSidebarOpenStateAtom } from '../../../atoms';
import { VirtualizedFileTree } from '../../virtualized/virtualized-file-tree';

export function MyFoldersAccordion() {
  const [openState, setOpenState] = useAtom(folderSidebarOpenStateAtom);
  const isOpen = openState.folders;
  const { data } = useFolders();
  const alphabetizedFolders = data?.alphabetizedFolders ?? null;
  const previousFolders = data?.previousAlphabetizedFolders ?? null;
  const { folder: currentFolder, isNoteRoute } = useFolderFromRoute();
  const [location] = useLocation();

  useEffect(() => {
    // Don't perform navigation logic if we're already on the 404 page
    if (location === routeUrls.patterns.NOT_FOUND_FALLBACK) {
      return;
    }

    if (alphabetizedFolders) {
      const isCurrentFolderInAlphabetizedFolders =
        alphabetizedFolders.some((folder) => folder === currentFolder) ?? false;

      // If you are on a folder that does not exist navigate to 404 page, this redirecting logic does not apply to saved search routes
      if (
        currentFolder &&
        !isCurrentFolderInAlphabetizedFolders &&
        isNoteRoute
      ) {
        if (!previousFolders || !previousFolders.includes(currentFolder)) {
          navigate(routeUrls.patterns.NOT_FOUND_FALLBACK, { replace: true });
        } else {
          const closestFolder = findClosestSidebarItemToNavigateTo(
            currentFolder,
            previousFolders,
            alphabetizedFolders
          );

          // If the closest folder is in the alphabetized folders, navigate to it
          if (
            closestFolder >= 0 &&
            closestFolder < alphabetizedFolders.length
          ) {
            navigate(routeUrls.folder(alphabetizedFolders[closestFolder]), {
              replace: true,
            });
          } else {
            navigate(routeUrls.patterns.NOT_FOUND_FALLBACK, {
              replace: true,
            });
          }
        }
      }
    }
  }, [alphabetizedFolders, currentFolder, previousFolders]);

  return (
    <section>
      <AccordionButton
        isOpen={isOpen}
        onClick={() =>
          setOpenState((prev) => ({
            ...prev,
            folders: !prev.folders,
          }))
        }
        icon={<Folder width={18} height={18} strokeWidth={1.75} />}
        title={
          <>
            Folders{' '}
            {alphabetizedFolders && alphabetizedFolders.length > 0 && (
              <span className="tracking-wider">
                ({alphabetizedFolders.length})
              </span>
            )}
          </>
        }
      />

      {/*<VirtualizedListAccordion<string>
        isOpen={isOpen}
        isError={isError}
        errorElement={
          <ErrorText
            message="Something went wrong when fetching your folders"
            onRetry={() => refetch()}
            icon={
              <FolderRefresh
                className="will-change-transform"
                width={16}
                height={16}
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
        contentType="folder"
        layoutId="folder-sidebar"
        emptyElement={
          <li className="list-none text-zinc-500 dark:text-zinc-300 text-xs text-balance">
            Create a folder using the &quot;Create Folder&quot; button above
          </li>
        }
        className="scrollbar-hidden"
        dataItemToString={(folderName) => folderName}
        dataItemToKey={(folderName) => folderName}
        selectionOptions={{
          dataItemToSelectionRangeEntry: (folderName) => folderName,
        }}
        isItemActive={(folderName) => folderName === currentFolder}
        maxHeight="65vh"
        renderItem={({ dataItem: sidebarFolderName, i }) => (
          <FolderAccordionButton
            sidebarFolderName={sidebarFolderName}
            i={i}
            alphabetizedFolders={alphabetizedFolders}
          />
        )}
        data={alphabetizedFolders}
      />*/}
      <VirtualizedFileTree isOpen={isOpen} />
    </section>
  );
}
