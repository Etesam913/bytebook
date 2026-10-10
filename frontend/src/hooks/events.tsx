import { Events as WailsEvents } from '@wailsio/runtime';
import { useEffect, useRef } from 'react';
import { isEventInCurrentWindow, type WailsEvent } from '@utils/events';

/** Helper to do something when a wails event is emitted from the backend */
export function useWailsEvent<E extends WailsEvents.WailsEventName>(
  eventName: E,
  callback: (res: WailsEvents.WailsEvent<E>) => void
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
    return WailsEvents.On(eventName, (res) => {
      callbackRef.current(res);
    });
  }, [eventName]);
}

/** Runs one callback for several Wails events, ignoring each event's payload. */
export function useWailsEvents(
  eventNames: readonly string[],
  callback: () => void
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  // Keyed by names so an inline array literal does not re-register listeners every render.
  const namesKey = eventNames.join('|');
  useEffect(() => {
    const unsubscribers = namesKey
      .split('|')
      .map((name) => WailsEvents.On(name, () => callbackRef.current()));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [namesKey]);
}

/** Like useWailsEvent, but the callback only runs for events emitted by this window. */
export function useCurrentWindowWailsEvent<
  E extends WailsEvents.WailsEventName,
>(eventName: E, callback: (event: WailsEvent<E>) => void) {
  useWailsEvent(eventName, (event) => {
    void (async () => {
      if (!(await isEventInCurrentWindow(event))) return;
      callback(event);
    })();
  });
}
