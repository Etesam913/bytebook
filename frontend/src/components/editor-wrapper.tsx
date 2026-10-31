import { useAnimationControls } from 'motion/react';
import { lazy, Suspense, useEffect } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { NoteRenderer } from '@components/note-renderer';
import { useFilePathFromRoute, useFolderPathFromRoute } from '@hooks/routes';
import { useNoteExists } from '@hooks/notes';
import { useAllPaths } from '@hooks/all-paths';
import { RouteFallback } from '@components/route-fallback';
import { NotFound } from '@components/not-found';
import { routeUrls } from '@utils/routes';

const FolderRenderer = lazy(() =>
  import('@components/folder-renderer').then((module) => ({
    default: module.FolderRenderer,
  }))
);

export function EditorWrapper() {
  const filePath = useFilePathFromRoute();
  const folderPath = useFolderPathFromRoute();
  const animationControls = useAnimationControls();
  const { isPending: isLoadingPaths } = useAllPaths();
  const {
    data: noteExists,
    isLoading,
    isFetching,
    error,
  } = useNoteExists(filePath);

  useEffect(() => {
    // A restored note may still have a cached missing result during refetch.
    if (!filePath || isLoading || isFetching) {
      return;
    }

    if (noteExists === false || error) {
      navigate(routeUrls.notFoundFallback());
    }
  }, [error, filePath, isLoading, isFetching, noteExists]);

  const isNoteUnavailable = isLoading || noteExists === false || !!error;
  const showNoteFallback = filePath !== null && isNoteUnavailable;

  if (isLoadingPaths || showNoteFallback) {
    return (
      <div className="flex h-full min-w-0 flex-1">
        <RouteFallback
          height="2.625rem"
          width="2.625rem"
          className="mx-auto my-auto"
        />
      </div>
    );
  }

  if (filePath) {
    return (
      <div className="flex h-full min-w-0 flex-1">
        <NoteRenderer filePath={filePath} />
      </div>
    );
  }

  if (folderPath) {
    return (
      <Suspense fallback={<RouteFallback height="2.625rem" width="2.625rem" />}>
        <FolderRenderer
          folderPath={folderPath}
          animationControls={animationControls}
        />
      </Suspense>
    );
  }

  return <NotFound kind="note" />;
}
