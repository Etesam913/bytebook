import { useAnimationControls } from 'motion/react';
import { useEffect } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { NoteRenderer } from '../../note-renderer';
import { FolderRenderer } from '../../folder-renderer';
import {
  useFilePathFromRoute,
  useFolderPathFromRoute,
} from '../../../hooks/routes';
import { useNoteExists } from '../../../hooks/notes';
import { RouteFallback } from '../../route-fallback';
import { NotFound } from '../../../routes/not-found';
import { routeUrls } from '../../../utils/routes';
export function EditorWrapper() {
  const filePath = useFilePathFromRoute();
  const folderPath = useFolderPathFromRoute();
  const animationControls = useAnimationControls();
  const { data: noteExists, isLoading, error } = useNoteExists(filePath);

  useEffect(() => {
    if (!filePath || isLoading) {
      return;
    }

    if (noteExists === false || error) {
      navigate(routeUrls.notFoundFallback());
    }
  }, [error, filePath, isLoading, noteExists]);

  if (filePath) {
    if (isLoading || noteExists === false || error) {
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

    return (
      <div className="flex h-full min-w-0 flex-1">
        <NoteRenderer filePath={filePath} />
      </div>
    );
  }

  if (folderPath) {
    return (
      <FolderRenderer
        folderPath={folderPath}
        animationControls={animationControls}
      />
    );
  }

  return <NotFound />;
}
