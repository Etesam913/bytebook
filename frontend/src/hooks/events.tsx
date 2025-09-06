import { Events as WailsEvents } from '@wailsio/runtime';
import { useEffect } from 'react';
import { useRoute } from 'wouter';
import { useSetAtom } from 'jotai/react';
import { currentFilePathAtom } from '../atoms';
import { FilePath } from '../utils/string-formatting';
import { useSearchParamsEntries } from '../utils/routing';

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

  // Check for note routes: /:folder/:note? and /tags/:tagName/:folder?/:note?
  const [isNoteRoute, params] = useRoute('/:folder/:note?');
  const extension = useSearchParamsEntries().ext;

  const folder = params?.folder;
  const note = params?.note;

  useEffect(() => {
    // If we're on a note route and have both folder and note parameters
    if (isNoteRoute && folder && note && extension) {
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
      // Not on a note route or missing required params, set to null
      setCurrentFilePath(null);
    }
  }, [isNoteRoute, folder, note, extension, setCurrentFilePath]);
}
