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
import { useNoteCreate, useNoteDelete, useNotes } from '../../hooks/notes.tsx';
import { Compose } from '../../icons/compose';
import { Folder } from '../../icons/folder';
import { Pen } from '../../icons/pen';
import { MyNotesSidebar } from './my-notes-sidebar.tsx';
import { RenderNote } from './render-note/index.tsx';
import { ErrorBoundary } from 'react-error-boundary';
import { RenderNoteFallback } from '../../components/error-boundary/render-note.tsx';
import { routeUrls } from '../../utils/routes.ts';
import { navigate } from 'wouter/use-browser-location';
import { findClosestSidebarItemToNavigateTo } from '../../utils/routing.ts';

export function NotesSidebar({
  folder,
  note,
  width,
  leftWidth,
}: {
  folder: string;
  note: string | undefined;
  width: MotionValue<number>;
  leftWidth: MotionValue<number>;
}) {
  // These are encoded params
  const setDialogData = useSetAtom(dialogDataAtom);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const sidebarRef = useRef<HTMLElement>(null);
  const { mutateAsync: renameFolder } = useFolderRenameMutation();
  const noteQueryResult = useNotes(folder);
  const notes = noteQueryResult.data?.notes;
  const previousNotes = noteQueryResult.data?.previousNotes;
  const openCreateNoteDialog = useCreateNoteDialog();

  // Auto navigate to the first note when the notes are loaded
  useEffect(() => {
    if (!notes || notes.length === 0) return;
    const filePathForFirstNote = notes[0];
    const isCurrentNoteInNoteQueryResult = notes.some(
      (filePath) => filePath.noteWithoutExtension === note
    );
    // If you are on a folder with no note selected, navigate to the first note
    if (!note) {
      navigate(filePathForFirstNote.getLinkToNote(), { replace: true });
    }
    // If you are on a note that does not exist, navigate to closest note or 404 page
    else if (!isCurrentNoteInNoteQueryResult) {
      if (
        !previousNotes ||
        !previousNotes.some(
          (filePath) => filePath.noteWithoutExtension === note
        )
      ) {
        navigate(routeUrls.patterns.NOT_FOUND_FALLBACK, { replace: true });
      } else {
        const closestNoteIndex = findClosestSidebarItemToNavigateTo(
          note,
          previousNotes.map((fp) => fp.noteWithoutExtension),
          notes.map((fp) => fp.noteWithoutExtension)
        );
        if (closestNoteIndex >= 0 && closestNoteIndex < notes.length) {
          navigate(notes[closestNoteIndex].getLinkToNote(), { replace: true });
        } else {
          navigate(routeUrls.patterns.NOT_FOUND_FALLBACK, { replace: true });
        }
      }
    }
  }, [notes, previousNotes, note]);

  useNoteCreate();
  useNoteDelete(folder);

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
                  <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {folder}
                  </p>
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
                            folderName={folder}
                          />
                        ),
                        onSubmit: (e, setErrorText) =>
                          renameFolder({
                            e,
                            setErrorText,
                            folderFromSidebar: folder,
                          }),
                      })
                    }
                  >
                    <Pen />
                  </MotionIconButton>
                </section>
                <MotionButton
                  {...getDefaultButtonVariants({
                    disabled: false,
                    whileHover: 1.025,
                    whileTap: 0.975,
                    whileFocus: 1.025,
                  })}
                  onClick={() => openCreateNoteDialog(folder)}
                  className="align-center flex w-full justify-between bg-transparent mb-2"
                >
                  Create Note <Compose className="will-change-transform" />
                </MotionButton>
              </header>
              <section className="flex flex-col gap-2 overflow-y-auto flex-1">
                <div className="flex h-full flex-col overflow-y-auto">
                  {notes && (
                    <MyNotesSidebar
                      layoutId="note-sidebar"
                      curNote={note}
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
        key={`${folder}-${note}`}
        FallbackComponent={(fallbackProps) => (
          <RenderNoteFallback {...fallbackProps} />
        )}
      >
        <RenderNote />
      </ErrorBoundary>
    </>
  );
}
