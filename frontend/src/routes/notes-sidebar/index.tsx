import { type MotionValue, motion } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Activity, useEffect, useRef } from 'react';
import { getDefaultButtonVariants } from '../../animations.ts';
import { dialogDataAtom } from '../../atoms';
import { isNoteMaximizedAtom } from '../../atoms';
import { MotionButton, MotionIconButton } from '../../components/buttons';
import { RenameFolderDialog } from '../../components/file-sidebar/my-files-accordion/folder-dialog-children.tsx';
import { Spacer } from '../../components/file-sidebar/spacer.tsx';
import { useCreateNoteDialog } from '../../hooks/dialogs.tsx';
import { useFolderRenameMutation } from '../../hooks/folders.tsx';
import {
  useNewNoteEvent,
  useNoteCreate,
  useNoteDelete,
  useNoteRename,
  useNotePageIndex,
} from '../../hooks/notes.tsx';
import { Compose } from '../../icons/compose';
import { Folder } from '../../icons/folder';
import { Pen } from '../../icons/pen';
import { MyNotesSidebar } from './my-notes-sidebar.tsx';
import { RenderNote } from './render-note/index.tsx';
import { ErrorBoundary } from 'react-error-boundary';
import { RenderNoteFallback } from '../../components/error-boundary/render-note.tsx';
import { useSearchParamsEntries } from '../../utils/routing.ts';
import { Tooltip } from '../../components/tooltip/index.tsx';
import { Command } from '../../icons/command.tsx';

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

  // Get the page index for the current note
  const curNoteWithExtension = curNote ? `${curNote}.md` : undefined;
  const { data: anchorPageIndex, isLoading } = useNotePageIndex(
    curFolder,
    curNoteWithExtension
  );

  const searchParams: { ext?: string } = useSearchParamsEntries();
  const curNoteExtension = searchParams?.ext;

  const sidebarRef = useRef<HTMLElement>(null);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const setDialogData = useSetAtom(dialogDataAtom);

  useNoteCreate();
  useNoteRename();
  useNoteDelete();

  return (
    <>
      <Activity mode={isNoteMaximized ? 'hidden' : 'visible'}>
        <motion.aside
          ref={sidebarRef}
          style={{ width }}
          className="text-md flex h-screen flex-col pb-3.5"
          data-testid="notes-sidebar"
        >
          <div className="flex h-full flex-col overflow-y-auto relative">
            <header className="pl-1.5 pr-2.5">
              <section className="flex items-center py-3.5 gap-2">
                <Folder className="min-w-5" />{' '}
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
                <MyNotesSidebar
                  layoutId="note-sidebar"
                  curFolder={curFolder}
                  curNote={curNote}
                  curNoteExtension={curNoteExtension}
                  anchorPageIndex={anchorPageIndex ?? 0}
                  anchorPageLoading={isLoading}
                />
              </div>
            </section>
          </div>
        </motion.aside>
        <Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
      </Activity>
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
