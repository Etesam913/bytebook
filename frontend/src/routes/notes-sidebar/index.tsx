import { type MotionValue, motion } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { getDefaultButtonVariants } from '../../animations.ts';
import { dialogDataAtom } from '../../atoms';
import { isNoteMaximizedAtom } from '../../atoms';
import { MotionButton, MotionIconButton } from '../../components/buttons';
import { RenameFolderDialog } from '../../components/folder-sidebar/my-folders-accordion/folder-dialog-children.tsx';
import { Spacer } from '../../components/folder-sidebar/spacer';
import { useCreateNoteDialog } from '../../hooks/dialogs.tsx';
import { useFolderRenameMutation } from '../../hooks/folders.tsx';
import {
  useNewNoteEvent,
  useNoteCreate,
  useNoteDelete,
  useNoteRename,
  useNotes,
} from '../../hooks/notes.tsx';
import { Compose } from '../../icons/compose';
import { Folder } from '../../icons/folder';
import { Pen } from '../../icons/pen';
import { MyNotesSidebar } from './my-notes-sidebar.tsx';
import { RenderNote } from './render-note/index.tsx';
import { ErrorBoundary } from 'react-error-boundary';
import { RenderNoteFallback } from '../../components/error-boundary/render-note.tsx';
import { navigate } from 'wouter/use-browser-location';
import {
  findClosestSidebarItemToNavigateTo,
  useSearchParamsEntries,
} from '../../utils/routing.ts';
import { Tooltip } from '../../components/tooltip/index.tsx';
import { Command } from '../../icons/command.tsx';
import { routeBuilders } from '../../utils/routes.ts';

export function NotesSidebar({
  curFolder,
  curNote,
  width,
  leftWidth,
}: {
  curFolder: string;
  curNote: string | undefined;
  width: MotionValue<number>;
  leftWidth: MotionValue<number>;
}) {
  useNewNoteEvent(curFolder);
  const openCreateNoteDialog = useCreateNoteDialog();
  const { mutateAsync: renameFolder } = useFolderRenameMutation();

  const noteQueryResult = useNotes(curFolder);
  const notes = noteQueryResult.data?.notes;
  const previousNotes = noteQueryResult.data?.previousNotes;

  const searchParams: { ext?: string } = useSearchParamsEntries();
  const curNoteExtension = searchParams?.ext;

  const sidebarRef = useRef<HTMLElement>(null);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const setDialogData = useSetAtom(dialogDataAtom);

  // Auto navigate to the first note when the notes are loaded
  useEffect(() => {
    if (!notes || notes.length === 0) {
      // If there are no notes, navigate to the folder
      navigate(routeBuilders.folder(curFolder), { replace: true });
      return;
    }

    const filePathForFirstNote = notes[0];
    const isCurrentNoteInNoteQueryResult = notes.some(
      (filePath) => filePath.noteWithoutExtension === curNote
    );

    // If you are on a folder with no note selected, navigate to the first note
    if (!curNote) {
      navigate(filePathForFirstNote.getLinkToNote(), { replace: true });
    }
    // If you are on a note that does not exist, navigate to closest note
    else if (!isCurrentNoteInNoteQueryResult) {
      if (
        !previousNotes ||
        !previousNotes.some(
          (filePath) => filePath.noteWithoutExtension === curNote
        )
      ) {
        // Note was not in previous notes - do nothing, let RenderNote handle it
      } else {
        const previousNoteNames = previousNotes.map(
          (fp) => fp.noteWithoutExtension
        );
        const currentNoteNames = notes.map((fp) => fp.noteWithoutExtension);

        const closestNoteIndex = findClosestSidebarItemToNavigateTo(
          curNote,
          previousNoteNames,
          currentNoteNames
        );

        if (closestNoteIndex >= 0 && closestNoteIndex < notes.length) {
          navigate(notes[closestNoteIndex].getLinkToNote(), { replace: true });
        }
      }
    }
  }, [notes, previousNotes, curNote]);

  useNoteCreate();
  useNoteRename();
  useNoteDelete(curFolder);

  return (
    <>
      {!isNoteMaximized && (
        <>
          <motion.aside
            ref={sidebarRef}
            style={{ width }}
            className="text-md flex h-screen flex-col pb-3.5"
          >
            <div className="flex h-full flex-col overflow-y-auto relative">
              <header className="pl-1.5 pr-2.5">
                <section className="flex items-center py-3.5 gap-2">
                  <Folder className="min-w-[20px]" />{' '}
                  <Tooltip content={curFolder} placement="bottom">
                    <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {curFolder}
                    </p>
                  </Tooltip>
                  <Tooltip content="Rename folder" placement="right">
                    <MotionIconButton
                      {...getDefaultButtonVariants()}
                      onClick={() =>
                        setDialogData({
                          isOpen: true,
                          title: 'Rename Folder',
                          isPending: false,
                          children: (errorText) => (
                            <RenameFolderDialog
                              errorText={errorText}
                              folderName={curFolder}
                            />
                          ),
                          onSubmit: (e, setErrorText) =>
                            renameFolder({
                              e,
                              setErrorText,
                              folderFromSidebar: curFolder,
                            }),
                        })
                      }
                    >
                      <Pen />
                    </MotionIconButton>
                  </Tooltip>
                </section>
                <Tooltip
                  placement="right"
                  content={
                    <span className="flex items-center gap-0.5">
                      <Command
                        className="will-change-transform"
                        width={12.8}
                        height={12.8}
                      />
                      <p>N</p>
                    </span>
                  }
                >
                  <MotionButton
                    {...getDefaultButtonVariants({
                      disabled: false,
                      whileHover: 1.025,
                      whileTap: 0.975,
                      whileFocus: 1.025,
                    })}
                    onClick={() => openCreateNoteDialog(curFolder)}
                    className="align-center flex w-full justify-between bg-transparent mb-2"
                  >
                    Create Note <Compose className="will-change-transform" />
                  </MotionButton>
                </Tooltip>
              </header>
              <section className="flex flex-col gap-2 overflow-y-auto flex-1">
                <div className="flex h-full flex-col overflow-y-auto">
                  {notes && (
                    <MyNotesSidebar
                      layoutId="note-sidebar"
                      curNote={curNote}
                      curNoteExtension={curNoteExtension}
                      noteQueryResult={noteQueryResult}
                    />
                  )}
                </div>
              </section>
            </div>
          </motion.aside>
          <Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
        </>
      )}
      <ErrorBoundary
        key={`${curFolder}-${curNote}`}
        FallbackComponent={(fallbackProps) => (
          <RenderNoteFallback {...fallbackProps} />
        )}
      >
        <RenderNote />
      </ErrorBoundary>
    </>
  );
}
