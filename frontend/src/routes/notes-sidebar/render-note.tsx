import { motion, useAnimationControls } from 'motion/react';
import { useAtomValue } from 'jotai';
import { getDefaultButtonVariants } from '../../animations';
import { draggedElementAtom } from '../../components/editor/atoms';
import { isNoteMaximizedAtom } from '../../atoms';
import { MotionIconButton } from '../../components/buttons';
import { MaximizeNoteButton } from '../../components/buttons/maximize-note';
import { NotesEditor } from '../../components/editor';
import { BottomBar } from '../../components/editor/bottom-bar';
import { useMostRecentNotes } from '../../components/editor/hooks/note-metadata';
import {
  useNoteExists,
  useNoteRevealInFinderMutation,
} from '../../hooks/notes';
import { FileBan } from '../../icons/file-ban';
import { ShareRight } from '../../icons/share-right';
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from '../../types';
import { cn } from '../../utils/string-formatting';
import { SidebarImage } from './sidebar-image';
import { SidebarVideo } from './sidebar-video';
import { useSearchParamsEntries } from '../../utils/routing';
import { useRoute } from 'wouter';
import { navigate } from 'wouter/use-browser-location';
import { RouteFallback } from '../../components/route-fallback';
import { FilePath } from '../../utils/string-formatting';

export function RenderNote() {
  const animationControls = useAnimationControls();
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const draggedElement = useAtomValue(draggedElementAtom);

  // The attributes have to be retrieved from useRoute as passing in the params as props was lagging behind for some reason
  const [, params] = useRoute('/:folder/:note?');
  const folder = params?.folder ?? '';
  const noteWithoutExtension = params?.note ?? '';

  const searchParams: { ext?: string } = useSearchParamsEntries();
  const fileExtension = searchParams.ext;
  const normalizedExtension = fileExtension?.toLowerCase().trim();
  const filePath = new FilePath({
    folder: decodeURIComponent(folder),
    note: `${decodeURIComponent(noteWithoutExtension)}.${normalizedExtension}`,
  });

  // Type Checks
  const hasCustomToolbar = filePath.noteExtension === 'md';
  const isPdf = filePath.noteExtension === 'pdf';
  const isMarkdown = filePath.noteExtension === 'md';
  const isImage =
    filePath.noteExtension &&
    IMAGE_FILE_EXTENSIONS.includes(filePath.noteExtension);
  const isVideo =
    filePath.noteExtension &&
    VIDEO_FILE_EXTENSIONS.includes(filePath.noteExtension);
  const isUnknownFile =
    !isPdf && !isMarkdown && !isImage && !isVideo && filePath.noteExtension;

  const fileUrl = filePath.getFileUrl();

  const { data: noteExists, isLoading, error } = useNoteExists(filePath);
  useMostRecentNotes(filePath);
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation(false);
  if (!noteWithoutExtension) return null;
  if (isLoading) {
    return <RouteFallback height={42} width={42} className="mx-auto my-auto" />;
  }

  if (!noteExists || error) {
    navigate('/404/404/404', { replace: true });
    return null;
  }

  return (
    <motion.div
      className="flex min-w-0 flex-1 flex-col leading-7 h-screen"
      animate={animationControls}
    >
      {!hasCustomToolbar && (
        <header
          className={cn(
            'flex items-center gap-1.5 border-b px-2 pb-1 pt-2.5 h-12 border-zinc-200 dark:border-b-zinc-700 whitespace-nowrap ml-[-4.5px]',
            isNoteMaximized && 'pl-[5.75rem]!'
          )}
        >
          <MaximizeNoteButton animationControls={animationControls} />
          <h1 className="text-sm text-ellipsis overflow-hidden">
            {folder}/{noteWithoutExtension}.{filePath.noteExtension}
          </h1>
          <MotionIconButton
            title="Open In Default App"
            {...getDefaultButtonVariants()}
            className="ml-auto"
            onClick={() => {
              revealInFinder({
                folder,
                selectionRange: new Set([
                  `note:${noteWithoutExtension}?ext=${filePath.noteExtension}`,
                ]),
              });
            }}
          >
            <ShareRight title="Open In Default App" />
          </MotionIconButton>
        </header>
      )}
      {isMarkdown && (
        <NotesEditor
          params={{ folder, note: noteWithoutExtension }}
          animationControls={animationControls}
        />
      )}

      {isPdf && (
        <>
          <iframe
            title={noteWithoutExtension}
            className={cn(
              'flex-1 overflow-auto mr-1',
              isNoteMaximized && 'w-full mr-0',
              draggedElement !== null && 'pointer-events-none'
            )}
            src={fileUrl}
          />
          <BottomBar filePath={filePath} />
        </>
      )}

      {isImage && (
        <SidebarImage
          key={`folder-${folder}-note-${noteWithoutExtension}-image`}
          filePath={filePath}
          fileUrl={fileUrl}
          isNoteMaximized={isNoteMaximized}
        />
      )}

      {isVideo && (
        <SidebarVideo
          key={`folder-${folder}-note-${noteWithoutExtension}-video`}
          filePath={filePath}
          fileUrl={fileUrl}
          isNoteMaximized={isNoteMaximized}
          draggedElement={draggedElement}
        />
      )}

      {isUnknownFile && (
        <>
          <section className="flex-1 flex flex-col items-center justify-center text-center px-3 pb-16 gap-3">
            <FileBan width={48} height={48} />
            <h1 className="text-2xl font-bold">
              This file type is not supported.
            </h1>
          </section>
          <BottomBar filePath={filePath} />
        </>
      )}
    </motion.div>
  );
}
