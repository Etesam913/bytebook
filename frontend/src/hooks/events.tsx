import { Events as WailsEvents } from '@wailsio/runtime';
import { useEffect } from 'react';
import { useRoute } from 'wouter';
import { useSetAtom } from 'jotai/react';
import { currentFilePathAtom } from '../atoms';
import { FilePath } from '../utils/string-formatting';
import { useSearchParamsEntries } from '../utils/routing';
import { routeUrls } from '../utils/routes';

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

/** Hook to track route changes and update FilePath atom when on a note route */
export function useRouteFilePath() {
  const setCurrentFilePath = useSetAtom(currentFilePathAtom);

  // Check for regular note routes: /:folder/:note?
  const [isNoteRoute, noteParams] = useRoute<{
    folder?: string;
    note?: string;
  }>(routeUrls.patterns.NOTES);

  // Check for saved-search routes: /saved-search/:searchQuery/:folder?/:note?
  const [isSavedSearchRoute, savedSearchParams] = useRoute<{
    searchQuery?: string;
    folder?: string;
    note?: string;
  }>(routeUrls.patterns.SAVED_SEARCH);

  const extension = useSearchParamsEntries().ext;

  // Extract folder and note from whichever route is active
  const folder = noteParams?.folder || savedSearchParams?.folder;
  const note = noteParams?.note || savedSearchParams?.note;
  const isRelevantRoute = isNoteRoute || isSavedSearchRoute;

  useEffect(() => {
    // If we're on a relevant route and have both folder and note parameters
    if (isRelevantRoute && folder && note && extension) {
      try {
        // Create FilePath instance
        const filePath = new FilePath({
          folder: folder,
          note: `${note}.${extension}`,
        });
        setCurrentFilePath(filePath);
      } catch (error) {
        // If FilePath creation fails (e.g., no extension), set to null
        setCurrentFilePath(null);
      }
    } else {
      // Not on a relevant route or missing required params, set to null
      setCurrentFilePath(null);
    }
  }, [isRelevantRoute, folder, note, extension, setCurrentFilePath]);
}
