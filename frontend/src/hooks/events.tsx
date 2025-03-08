import { Events as WailsEvents } from '@wailsio/runtime';
import { useEffect } from 'react';

type WailsEvent = {
  name: string;
  sender: string;
  data: unknown;
};

/** Helper to do something when a wails event is emitted from the backend */
export function useWailsEvent(
  eventName: string,
  callback: (res: WailsEvent) => void
) {
  // @ts-expect-error the events function can be returned
  useEffect(() => {
    return WailsEvents.On(eventName, callback);
  }, [eventName, callback]);
}
