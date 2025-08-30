import { Window } from '@wailsio/runtime';
import { WailsEvent } from '../hooks/events';

export async function isEventInCurrentWindow(data: WailsEvent) {
  const windowName = await Window.Name();
  if (windowName !== data.sender) return false;
  return true;
}
