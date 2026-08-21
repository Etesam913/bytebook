import { Events as WailsEvents } from '@wailsio/runtime';
import { useEffect, useRef } from 'react';

/**
 * A Wails event. For event names registered on the backend, `data` is typed
 * via the generated `Events.CustomEvents` augmentation in
 * bindings/github.com/wailsapp/wails/v3/internal/eventdata.d.ts.
 */
export type WailsEvent<
  E extends WailsEvents.WailsEventName = WailsEvents.WailsEventName,
> = WailsEvents.WailsEvent<E>;

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
