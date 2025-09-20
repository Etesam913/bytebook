import { Events as WailsEvents } from '@wailsio/runtime';
import { useEffect } from 'react';
import { useRoute } from 'wouter';
import { useSetAtom } from 'jotai/react';
import { currentFilePathAtom } from '../atoms';
import { FilePath } from '../utils/string-formatting';
import { useSearchParamsEntries } from '../utils/routing';
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
 * Returns the folder parameter from the current route, whether it's a note route or a saved search route.
 * Decodes the folder name before returning.
 * @returns {string | undefined} The decoded folder name from the route, or undefined if not present.
 */
export function useFolderFromRoute(): string | undefined {
  const [isNoteRoute, noteParams] = useRoute<NotesRouteParams>(
    routeUrls.patterns.NOTES
  );

  const [, savedSearchParams] = useRoute<SavedSearchRouteParams>(
    routeUrls.patterns.SAVED_SEARCH
  );

  const folder = isNoteRoute ? noteParams?.folder : savedSearchParams?.folder;
  return folder ? decodeURIComponent(folder) : undefined;
}

/**
 * Returns the note parameter from the current route, whether it's a note route or a saved search route.
 * Decodes the note name before returning.
 * @returns {string | undefined} The decoded note name from the route, or undefined if not present.
 */
export function useNoteFromRoute(): string | undefined {
  const [isNoteRoute, noteParams] = useRoute<NotesRouteParams>(
    routeUrls.patterns.NOTES
  );
  const [, savedSearchParams] = useRoute<SavedSearchRouteParams>(
    routeUrls.patterns.SAVED_SEARCH
  );
  const note = isNoteRoute ? noteParams?.note : savedSearchParams?.note;
  return note ? decodeURIComponent(note) : undefined;
}

/**
 * Hook to track route changes and update FilePath atom when on a note route
 * FilePath is set to null when a note or a folder is not present in the route
 */
export function useRouteFilePath() {
  const setCurrentFilePath = useSetAtom(currentFilePathAtom);

  const folder = useFolderFromRoute();
  const note = useNoteFromRoute();
  const extension = useSearchParamsEntries().ext;

  const isRelevantRoute = !!folder && !!note && !!extension;

  useEffect(() => {
    if (isRelevantRoute) {
      try {
        const filePath = new FilePath({
          folder: folder!,
          note: `${note!}.${extension}`,
        });
        setCurrentFilePath(filePath);
      } catch {
        setCurrentFilePath(null);
      }
    } else {
      setCurrentFilePath(null);
    }
  }, [isRelevantRoute, folder, note, extension, setCurrentFilePath]);
}
