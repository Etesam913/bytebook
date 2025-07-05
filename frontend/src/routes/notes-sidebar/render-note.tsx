import { motion, useAnimationControls } from 'motion/react';
import { useAtomValue } from 'jotai';
import { getDefaultButtonVariants } from '../../animations';
import { draggedElementAtom, isNoteMaximizedAtom } from '../../atoms';
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
import { FILE_SERVER_URL } from '../../utils/general';
import { cn } from '../../utils/string-formatting';
import { SidebarImage } from './sidebar-image';
import { SidebarVideo } from './sidebar-video';
import { useSearchParamsEntries } from '../../utils/routing';
import { useRoute } from 'wouter';
import { navigate } from 'wouter/use-browser-location';
import { RouteFallback } from '../../components/route-fallback';

export function RenderNote({ isInTagsSidebar }: { isInTagsSidebar: boolean }) {
  const animationControls = useAnimationControls();
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);

  // The attributes have to be retrieved from useRoute as passing in the params as props was lagging behind for some reason
  const [, params] = useRoute(
    isInTagsSidebar ? '/tags/:tagName/:folder/:note' : '/:folder/:note?'
  );
  const folder = params?.folder ?? '';
  const note = params?.note ?? '';

  const searchParams: { ext?: string } = useSearchParamsEntries();
  const fileExtension = searchParams.ext;
  const normalizedExtension = fileExtension?.toLowerCase().trim();
  const hasCustomToolbar = normalizedExtension === 'md';

  const isPdf = normalizedExtension === 'pdf';
  const isMarkdown = normalizedExtension === 'md';
  const isImage =
    normalizedExtension && IMAGE_FILE_EXTENSIONS.includes(normalizedExtension);
  const isVideo =
    normalizedExtension && VIDEO_FILE_EXTENSIONS.includes(normalizedExtension);
  const isUnknownFile =
    !isPdf && !isMarkdown && !isImage && !isVideo && normalizedExtension;
  const draggedElement = useAtomValue(draggedElementAtom);

  const fileUrl = `${FILE_SERVER_URL}/notes/${folder}/${note}.${normalizedExtension}`;
  const {
    data: noteExists,
    isLoading,
    error,
  } = useNoteExists(
    decodeURIComponent(folder),
    decodeURIComponent(note),
    fileExtension
  );
  useMostRecentNotes(folder, note, normalizedExtension);
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation(false);
  if (!note) return null;
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
            {folder}/{note}.{normalizedExtension}
          </h1>
          <MotionIconButton
            title="Open In Default App"
            {...getDefaultButtonVariants()}
            className="ml-auto"
            onClick={() => {
              revealInFinder({
                folder,
                selectionRange: new Set([
                  `note:${note}?ext=${normalizedExtension}`,
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
          params={{ folder, note }}
          animationControls={animationControls}
        />
      )}

      {isPdf && (
        <>
          <iframe
            title={note}
            className={cn(
              'flex-1 overflow-auto mr-1 dark:invert',
              isNoteMaximized && 'w-full mr-0',
              draggedElement !== null && 'pointer-events-none'
            )}
            src={fileUrl}
          />
          <BottomBar folder={folder} note={note} ext={normalizedExtension} />
        </>
      )}

      {isImage && (
        <SidebarImage
          key={`folder-${folder}-note-${note}-image`}
          folder={folder}
          note={note}
          fileUrl={fileUrl}
          fileExtension={normalizedExtension}
          isNoteMaximized={isNoteMaximized}
        />
      )}

      {isVideo && (
        <SidebarVideo
          key={`folder-${folder}-note-${note}-video`}
          folder={folder}
          note={note}
          fileUrl={fileUrl}
          fileExtension={normalizedExtension}
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
          <BottomBar folder={folder} note={note} ext={normalizedExtension} />
        </>
      )}
    </motion.div>
  );
}
