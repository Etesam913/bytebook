import { type MotionValue, motion } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useRef } from 'react';
import { getDefaultButtonVariants } from '../../animations.ts';
import { dialogDataAtom, isNoteMaximizedAtom } from '../../atoms';
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
import { MyNotesAccordion } from './my-notes-accordion.tsx';
import { RenderNote } from './render-note.tsx';
import {
  useKernelHeartbeat,
  useKernelShutdown,
  useKernelStatus,
} from '../../hooks/code.tsx';

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
  // If the fileExtension is undefined, then it is a markdown file
  const fileExtension = searchParams?.ext;

  const noteQueryResult = useNotes(folder, note, fileExtension);
  const createNoteDialog = useCreateNoteDialog();

  useNoteCreate();
  useNoteDelete(folder);
  useKernelStatus();
  useKernelHeartbeat();
  useKernelShutdown();

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
                <section className="flex items-center min-h-[3.625rem] gap-2">
                  <Folder className="min-w-[1.25rem]" width={20} height={20} />{' '}
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
                    <Pen className="w-full" />
                  </MotionIconButton>
                </section>
                <MotionButton
                  {...getDefaultButtonVariants(false, 1.025, 0.975, 1.025)}
                  onClick={() => createNoteDialog(folder)}
                  className="align-center flex w-full justify-between bg-transparent mb-2"
                >
                  Create Note <Compose className="will-change-transform" />
                </MotionButton>
              </header>
              <section className="flex flex-col gap-2 overflow-y-auto flex-1">
                <div className="flex h-full flex-col overflow-y-auto">
                  <MyNotesAccordion
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

      <RenderNote isInTagsSidebar={false} />
    </>
  );
}
