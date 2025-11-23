import { motion, useAnimationControls } from 'motion/react';
import { useAtomValue } from 'jotai';
import { draggedGhostElementAtom } from '../../../components/editor/atoms';
import { isNoteMaximizedAtom } from '../../../atoms';
import { NotesEditor } from '../../../components/editor';
import { BottomBar } from '../../../components/editor/bottom-bar';
import { useMostRecentNotes } from '../../../components/editor/hooks/note-metadata';
import { useNoteExists } from '../../../hooks/notes';
import { FileBan } from '../../../icons/file-ban';
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from '../../../types';
import { cn } from '../../../utils/string-formatting';
import { ImageNote } from './image-note';
import { NonMarkdownToolbar } from './non-markdown-toolbar';
import { VideoNote } from './video-note';
import { useSearchParamsEntries } from '../../../utils/routing';
import { useRoute } from 'wouter';
import { navigate } from 'wouter/use-browser-location';
import { RouteFallback } from '../../../components/route-fallback';
import { LocalFilePath } from '../../../utils/string-formatting';
import {
  routeUrls,
  type NotesRouteParams,
  type SavedSearchRouteParams,
} from '../../../utils/routes';

function getFileTypeChecks(extension: string | undefined) {
  const isPdf = extension === 'pdf';
  const isMarkdown = extension === 'md';
  const isImage = extension && IMAGE_FILE_EXTENSIONS.includes(extension);
  const isVideo = extension && VIDEO_FILE_EXTENSIONS.includes(extension);
  const isUnknownFile =
    !isPdf && !isMarkdown && !isImage && !isVideo && extension;

  return {
    isPdf,
    isMarkdown,
    isImage,
    isVideo,
    isUnknownFile,
  };
}

export function RenderNote() {
  const animationControls = useAnimationControls();
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const draggedGhostElement = useAtomValue(draggedGhostElementAtom);

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
  const filePath = new LocalFilePath({
    folder: decodeURIComponent(folder),
    note: `${decodeURIComponent(noteWithoutExtension)}.${normalizedExtension}`,
  });
  useMostRecentNotes(filePath);

  const { isPdf, isMarkdown, isImage, isVideo, isUnknownFile } =
    getFileTypeChecks(filePath.noteExtension);

  const fileUrl = filePath.getFileUrl();

  const { data: noteExists, isLoading, error } = useNoteExists(filePath);
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
      {!isMarkdown && (
        <NonMarkdownToolbar
          animationControls={animationControls}
          folder={folder}
          noteWithoutExtension={noteWithoutExtension}
          filePath={filePath}
        />
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
              draggedGhostElement !== null && 'pointer-events-none'
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
          draggedGhostElement={draggedGhostElement}
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
