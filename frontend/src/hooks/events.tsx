import { Events as WailsEvents } from '@wailsio/runtime';
import { useEffect, useRef } from 'react';

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
  // Latest-ref pattern: callers commonly pass inline arrow functions, so the
  // `callback` identity changes every render. Holding it in a ref lets the
  // effect register the Wails listener once per `eventName` while still
  // dispatching to the freshest closure — avoiding a cleanup/re-register
  // churn that could drop events fired during the gap.
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    // @ts-expect-error the events function can be returned
    return WailsEvents.On(eventName, (res: WailsEvent) => {
      callbackRef.current(res);
    });
  }, [eventName]);
}
