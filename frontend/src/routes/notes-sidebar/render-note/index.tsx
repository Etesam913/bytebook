import { motion, useAnimationControls } from 'motion/react';
import { useAtomValue } from 'jotai';
import { getDefaultButtonVariants } from '../../../animations';
import { draggedElementAtom } from '../../../components/editor/atoms';
import { isNoteMaximizedAtom } from '../../../atoms';
import { MotionIconButton } from '../../../components/buttons';
import { MaximizeNoteButton } from '../../../components/buttons/maximize-note';
import { NotesEditor } from '../../../components/editor';
import { BottomBar } from '../../../components/editor/bottom-bar';
import { useMostRecentNotes } from '../../../components/editor/hooks/note-metadata';
import {
  useNoteExists,
  useNoteRevealInFinderMutation,
} from '../../../hooks/notes';
import { FileBan } from '../../../icons/file-ban';
import { ShareRight } from '../../../icons/share-right';
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from '../../../types';
import { cn } from '../../../utils/string-formatting';
import { ImageNote } from './image-note';
import { VideoNote } from './video-note';
import { useSearchParamsEntries } from '../../../utils/routing';
import { useRoute } from 'wouter';
import { navigate } from 'wouter/use-browser-location';
import { RouteFallback } from '../../../components/route-fallback';
import { FilePath } from '../../../utils/string-formatting';
import {
  routeUrls,
  type NotesRouteParams,
  type SavedSearchRouteParams,
} from '../../../utils/routes';

export function RenderNote() {
  const animationControls = useAnimationControls();
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const draggedElement = useAtomValue(draggedElementAtom);

  // The attributes have to be retrieved from useRoute as passing in the params as props was lagging behind for some reason
  const [isNoteRoute, params] = useRoute<NotesRouteParams>(
    routeUrls.patterns.NOTES
  );
  const [, savedSearchParams] = useRoute<SavedSearchRouteParams>(
    routeUrls.patterns.SAVED_SEARCH
  );

  const folder = isNoteRoute
    ? (params?.folder ?? '')
    : (savedSearchParams?.folder ?? '');
  const noteWithoutExtension = isNoteRoute
    ? (params?.note ?? '')
    : (savedSearchParams?.note ?? '');

  const searchParams: { ext?: string; notFound?: string } =
    useSearchParamsEntries();
  const fileExtension = searchParams.ext;
  const isNotFoundFromParam = searchParams.notFound !== undefined;
  const normalizedExtension = fileExtension?.toLowerCase().trim();
  const filePath = new FilePath({
    folder: decodeURIComponent(folder),
    note: `${decodeURIComponent(noteWithoutExtension)}.${normalizedExtension}`,
  });
  useMostRecentNotes(filePath);

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
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
  if (!noteWithoutExtension) return null;

  if (isLoading) {
    return <RouteFallback height={42} width={42} className="mx-auto my-auto" />;
  }

  if (!noteExists || error || isNotFoundFromParam) {
    // Add notFound query param if not already present
    if (!isNotFoundFromParam) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('notFound', 'true');
      navigate(`${currentUrl.pathname}${currentUrl.search}`, { replace: true });
    }

    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-center p-6 mx-auto">
        <div className="flex flex-col items-center gap-3">
          <FileBan width={48} height={48} />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Note not found</h2>
            <p className="text-balance text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
              The note <b>{filePath.toString()}</b> does not exist or could not
              be loaded.
            </p>
          </div>
        </div>
      </div>
    );
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
                selectionRange: new Set([`note:${filePath.note}`]),
              });
            }}
          >
            <ShareRight title="Open In Default App" />
          </MotionIconButton>
        </header>
      )}
      {isMarkdown && (
        <NotesEditor
          filePath={filePath}
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
        <ImageNote
          key={`folder-${folder}-note-${noteWithoutExtension}-image`}
          filePath={filePath}
          fileUrl={fileUrl}
          isNoteMaximized={isNoteMaximized}
        />
      )}

      {isVideo && (
        <VideoNote
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
