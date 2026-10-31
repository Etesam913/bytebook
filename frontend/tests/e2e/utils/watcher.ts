import type { Page } from '@playwright/test';
import type { Events as WailsEvents } from '@wailsio/runtime';
import { updateMockBindingResponse } from './mock-binding';
import { BINDINGS } from './service-files';
import { emitWailsEvent } from './wails-events';

export async function simulateWatcherChange<
  E extends WailsEvents.WailsEventName,
>(page: Page, paths: string[], event: E, data: WailsEvents.WailsEventData<E>) {
  await updateMockBindingResponse(page, BINDINGS.ALL_PATHS, {
    success: true,
    message: '',
    data: paths,
  });
  await emitWailsEvent(page, event, data);
}
