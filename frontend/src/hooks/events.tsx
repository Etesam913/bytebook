import { Events as WailsEvents } from '@wailsio/runtime';
import { useEffect } from 'react';
import { useRoute } from 'wouter';
import { useSetAtom } from 'jotai/react';
import { currentFilePathAtom } from '../atoms';
import {
  createFilePath,
  LocalFilePath,
  safeDecodeURIComponent,
} from '../utils/path';
import {
  routeUrls,
  type NotesRouteParams,
  type SavedSearchRouteParams,
} from '../utils/routes';

export type WailsEvent = {
  name: string;
  sender: string;
  data: unknown;
};

/** Helper to do something when a wails event is emitted from the backend */
export function useWailsEvent(
  eventName: string,
  callback: (res: WailsEvent) => void
) {
  useEffect(() => {
    // @ts-expect-error the events function can be returned
    return WailsEvents.On(eventName, callback);
  }, [eventName, callback]);
}

/**
 * Returns the current folder from wildcard note routes (`/notes/*` and `/saved-search/:query/*`).
 */
export function useFolderFromRoute(): {
  folder: string | undefined;
  isSavedSearchRoute: boolean;
  isNoteRoute: boolean;
} {
  const [isSavedSearchRoute, savedSearchParams] =
    useRoute<SavedSearchRouteParams>(routeUrls.patterns.SAVED_SEARCH);

  const [isNoteRoute, noteParams] = useRoute<NotesRouteParams>(
    routeUrls.patterns.NOTES
  );
  let folder: string | undefined;
  let routePath: string | undefined;

  if (isSavedSearchRoute) {
    routePath = savedSearchParams?.['*'];
  } else if (isNoteRoute) {
    routePath = noteParams?.['*'];
  }

  const normalizedPath = routePath
    ? safeDecodeURIComponent(routePath).split('/').filter(Boolean).join('/')
    : undefined;

  if (normalizedPath) {
    folder =
      createFilePath(normalizedPath)?.folder ??
      normalizedPath.split('/').filter(Boolean)[0];
  }

  return {
    folder,
    isSavedSearchRoute,
    isNoteRoute,
  };
}

/**
 * Hook to track route changes and update FilePath atom from wildcard note routes.
 * FilePath is set to null when the wildcard segment is missing or not a file.
 */
export function useRouteFilePath() {
  const setCurrentFilePath = useSetAtom(currentFilePathAtom);
  const [isSavedSearchRoute, savedSearchParams] =
    useRoute<SavedSearchRouteParams>(routeUrls.patterns.SAVED_SEARCH);
  const [isNoteRoute, noteParams] = useRoute<NotesRouteParams>(
    routeUrls.patterns.NOTES
  );

  const routePath = isNoteRoute
    ? noteParams?.['*']
    : isSavedSearchRoute
      ? savedSearchParams?.['*']
      : undefined;
  const normalizedPath = routePath
    ? safeDecodeURIComponent(routePath).split('/').filter(Boolean).join('/')
    : undefined;

  useEffect(() => {
    if (!normalizedPath) {
      setCurrentFilePath(null);
      return;
    }

    const parsedFilePath = createFilePath(normalizedPath);
    if (!parsedFilePath) {
      setCurrentFilePath(null);
      return;
    }

    try {
      const filePath = new LocalFilePath({
        folder: parsedFilePath.folder,
        note: parsedFilePath.note,
      });
      setCurrentFilePath(filePath);
    } catch {
      setCurrentFilePath(null);
    }
  }, [normalizedPath, setCurrentFilePath]);
}
