import type { UseQueryResult } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useAtom } from 'jotai/react';
import { getDefaultButtonVariants } from '../../animations.ts';
import { noteSortAtom } from '../../atoms.ts';
import { MotionButton } from '../../components/buttons/index.tsx';
import { SortButton } from '../../components/buttons/sort.tsx';
import { Sidebar } from '../../components/sidebar/index.tsx';
import { FileRefresh } from '../../icons/file-refresh.tsx';
import { Loader } from '../../icons/loader.tsx';
import { Note } from '../../icons/page.tsx';
import { NoteSidebarButton } from './sidebar-button/index.tsx';
import { FilePath } from '../../utils/string-formatting.ts';

export function MyNotesSidebar({
  curNote,
  layoutId,
  noteQueryResult,
}: {
  curFolder: string;
  curNote: string | undefined;
  fileExtension: string | undefined;
  layoutId: string;
  noteQueryResult: UseQueryResult<FilePath[], Error>;
}) {
  const { data: notes, refetch, isError, isLoading } = noteQueryResult;
  const noteCount = notes?.length ?? 0;
  // The sidebar note name includes the folder name if it's in a tag sidebar
  const [noteSortData, setNoteSortData] = useAtom(noteSortAtom);

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
      <div className="flex items-center justify-between gap-2 pr-1">
        <p className="flex items-center gap-1.5 py-1 rounded-md pl-[6px] pr-[10px] transition-colors">
          <Note title="Note" className="min-w-[1.25rem]" />
          My Notes{' '}
          {noteCount > 0 && (
            <span className="tracking-wider">({noteCount})</span>
          )}
        </p>

        <SortButton
          sortDirection={noteSortData}
          setSortDirection={setNoteSortData}
        />
      </div>
      {isError && (
        <div className="text-center text-xs my-3 flex flex-col items-center gap-2 text-balance">
          <p className="text-red-500">
            Something went wrong when retrieving the notes
          </p>
          <MotionButton
            {...getDefaultButtonVariants(false, 1.025, 0.975, 1.025)}
            className="mx-2.5 flex text-center"
            onClick={() => refetch()}
          >
            <span>Retry</span>{' '}
            <FileRefresh
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
          <Sidebar<FilePath>
            contentType="note"
            key={layoutId}
            layoutId={layoutId}
            emptyElement={
              <li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
                Create a note with the &quot;Create Note&quot; button above
              </li>
            }
            data={notes ?? []}
            dataItemToString={(filePath) => filePath.noteWithoutExtension}
            dataItemToSelectionRangeEntry={(filePath) => {
              return filePath.note;
            }}
            renderLink={({ dataItem: sidebarNotePath, i }) => {
              return (
                <NoteSidebarButton
                  sidebarNotePath={sidebarNotePath}
                  activeNoteNameWithoutExtension={curNote}
                  sidebarNoteIndex={i}
                />
              );
            }}
          />
        ))}
    </div>
  );
}
