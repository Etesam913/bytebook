import { type MotionValue, motion } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useRef } from 'react';
import { getDefaultButtonVariants } from '../../animations.ts';
import { dialogDataAtom } from '../../atoms';
import { isNoteMaximizedAtom } from '../../atoms';
import { MotionButton, MotionIconButton } from '../../components/buttons';
import { FolderDialogChildren } from '../../components/folder-sidebar/folder-dialog-children.tsx';
import { Spacer } from '../../components/folder-sidebar/spacer';
import { useCreateNoteDialog } from '../../hooks/dialogs.tsx';
import { useFolderDialogSubmit } from '../../hooks/folders.tsx';
import { useNoteCreate, useNoteDelete, useNotes } from '../../hooks/notes.tsx';
import { Compose } from '../../icons/compose';
import { Folder } from '../../icons/folder';
import { Pen } from '../../icons/pen';
import { useSearchParamsEntries } from '../../utils/routing';
import { MyNotesSidebar } from './my-notes-sidebar.tsx';
import { RenderNote } from './render-note.tsx';
import { ErrorBoundary } from 'react-error-boundary';
import { RenderNoteFallback } from '../../components/error-boundary/render-note.tsx';

export function NotesSidebar({
  params,
  width,
  leftWidth,
}: {
  params: { folder: string; note?: string };
  width: MotionValue<number>;
  leftWidth: MotionValue<number>;
}) {
  // These are encoded params
  const { folder, note } = params;
  const setDialogData = useSetAtom(dialogDataAtom);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const sidebarRef = useRef<HTMLElement>(null);
  const { mutateAsync: folderDialogSubmit } = useFolderDialogSubmit();
  const searchParams: { ext?: string } = useSearchParamsEntries();
  const fileExtension = searchParams?.ext;

  const noteQueryResult = useNotes(folder, `${note}.${fileExtension}`);
  const openCreateNoteDialog = useCreateNoteDialog();

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
                    {decodeURIComponent(folder)}
                  </p>
                  <MotionIconButton
                    {...getDefaultButtonVariants()}
                    onClick={() =>
                      setDialogData({
                        isOpen: true,
                        title: 'Rename Folder',
                        isPending: false,
                        children: (errorText) => (
                          <FolderDialogChildren
                            errorText={errorText}
                            action="rename"
                            folderName={decodeURIComponent(folder)}
                          />
                        ),
                        onSubmit: (e, setErrorText) =>
                          folderDialogSubmit({
                            e,
                            setErrorText,
                            action: 'rename',
                            folderFromSidebar: decodeURIComponent(folder),
                          }),
                      })
                    }
                  >
                    <Pen />
                  </MotionIconButton>
                </section>
                <MotionButton
                  {...getDefaultButtonVariants(false, 1.025, 0.975, 1.025)}
                  onClick={() => openCreateNoteDialog(folder)}
                  className="align-center flex w-full justify-between bg-transparent mb-2"
                >
                  Create Note <Compose className="will-change-transform" />
                </MotionButton>
              </header>
              <section className="flex flex-col gap-2 overflow-y-auto flex-1">
                <div className="flex h-full flex-col overflow-y-auto">
                  <MyNotesSidebar
                    layoutId="note-sidebar"
                    curFolder={folder}
                    curNote={note}
                    fileExtension={fileExtension}
                    noteQueryResult={noteQueryResult}
                  />
                </div>
              </section>
            </div>
          </motion.aside>
          <Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
        </>
      )}
      <ErrorBoundary
        key={`${folder}-${note}-${fileExtension}`}
        FallbackComponent={(fallbackProps) => (
          <RenderNoteFallback
            {...fallbackProps}
            folder={decodeURIComponent(folder)}
            note={note}
            fileExtension={fileExtension}
          />
        )}
      >
        <RenderNote isInTagsSidebar={false} />
      </ErrorBoundary>
    </>
  );
}
