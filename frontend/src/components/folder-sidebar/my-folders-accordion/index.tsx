import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { getDefaultButtonVariants } from '../../../animations';
import { useFolders } from '../../../hooks/folders';
import { Folder } from '../../../icons/folder';
import { FolderRefresh } from '../../../icons/folder-refresh';
import { Loader } from '../../../icons/loader';
import { MotionButton } from '../../buttons';
import { Sidebar } from '../../sidebar';
import { AccordionButton } from '../../sidebar/accordion-button';
import { FolderAccordionButton } from './button';

export function MyFoldersAccordion({ folder }: { folder: string | undefined }) {
  const [isOpen, setIsOpen] = useState(true);
  const { alphabetizedFolders, isLoading, isError, refetch } =
    useFolders(folder);

  return (
    <section>
      <AccordionButton
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
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
            {isError && (
              <div className="text-center text-xs my-3 flex flex-col items-center gap-2 text-balance">
                <p className="text-red-500">
                  Something went wrong when fetching the folders
                </p>
                <MotionButton
                  {...getDefaultButtonVariants({ disabled: false, whileHover: 1.025, whileTap: 0.975, whileFocus: 1.025 })}
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
                    <li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
                      Create a folder with the &quot;Create Folder&quot; button
                      above
                    </li>
                  }
                  dataItemToString={(folderName) => folderName}
                  dataItemToSelectionRangeEntry={(folderName) => folderName}
                  renderLink={({ dataItem: sidebarFolderName, i }) => {
                    return (
                      <FolderAccordionButton
                        folderFromUrl={folder}
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

