import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { getDefaultButtonVariants } from '../../../animations';
import { useFolders } from '../../../hooks/folders';
import { Folder } from '../../../icons/folder';
import { FolderRefresh } from '../../../icons/folder-refresh';
import { Loader } from '../../../icons/loader';
import {} from '../../../utils/selection';
import { MotionButton } from '../../buttons';
import { Sidebar } from '../../sidebar';
import { AccordionButton } from '../../sidebar/accordion-button';
import {} from './folder-dialog-children';
import { navigate } from 'wouter/use-browser-location';
import { useLocation } from 'wouter';
import { routeUrls } from '../../../utils/routes';
import { useFolderFromRoute } from '../../../hooks/events';
import { findClosestSidebarItemToNavigateTo } from '../../../utils/routing';
import { FolderAccordionButton } from './folder-accordion-button';
import { folderSidebarOpenStateAtom } from '../../../atoms';

export function MyFoldersAccordion() {
  const [openState, setOpenState] = useAtom(folderSidebarOpenStateAtom);
  const isOpen = openState.folders;
  const { data, isLoading, isError, refetch } = useFolders();
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
        icon={<Folder width={20} height={20} strokeWidth={1.75} />}
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
            {isError && (
              <div className="text-center text-xs my-3 flex flex-col items-center gap-2 text-balance">
                <p className="text-red-500">
                  Something went wrong when fetching the folders
                </p>
                <MotionButton
                  {...getDefaultButtonVariants({
                    disabled: false,
                    whileHover: 1.025,
                    whileTap: 0.975,
                    whileFocus: 1.025,
                  })}
                  className="mx-2.5 flex text-center"
                  onClick={() => refetch()}
                >
                  <span>Retry</span>{' '}
                  <FolderRefresh
                    className="will-change-transform"
                    width={16}
                    height={16}
                  />
                </MotionButton>
              </div>
            )}
            {!isError &&
              (isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <Loader width={20} height={20} className="mx-auto my-3" />
                </motion.div>
              ) : (
                <Sidebar<string>
                  contentType="folder"
                  layoutId="folder-sidebar"
                  emptyElement={
                    <li className="list-none text-zinc-500 dark:text-zinc-300 text-xs text-balance">
                      Create a folder using the &quot;Create Folder&quot; button
                      above
                    </li>
                  }
                  dataItemToString={(folderName) => folderName}
                  dataItemToKey={(folderName) => folderName}
                  dataItemToSelectionRangeEntry={(folderName) => folderName}
                  renderLink={({ dataItem: sidebarFolderName, i }) => {
                    return (
                      <FolderAccordionButton
                        sidebarFolderName={sidebarFolderName}
                        i={i}
                        alphabetizedFolders={alphabetizedFolders}
                      />
                    );
                  }}
                  data={alphabetizedFolders}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
