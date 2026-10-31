import { test as base } from '@playwright/test';
import { mockBinding } from './mock-binding';
import { MOCK_PROJECT_SETTINGS_RESPONSE, ok } from './mock-responses';
import { BINDINGS } from './service-files';

export const test = base.extend<{ app: void }>({
  app: [
    async ({ context }, use) => {
      await mockBinding(context, BINDINGS.ALL_PATHS, ok([]));
      await mockBinding(
        context,
        BINDINGS.PROJECT_SETTINGS,
        MOCK_PROJECT_SETTINGS_RESPONSE
      );
      await mockBinding(context, BINDINGS.FONT_FAMILIES, ok([]));
      await mockBinding(context, BINDINGS.TAGS, ok([]));
      await mockBinding(context, BINDINGS.TAGS_FOR_NOTES, ok({}));
      await mockBinding(context, BINDINGS.SAVED_SEARCHES, ok([]));
      await mockBinding(context, BINDINGS.LINKED_MENTIONS, ok([]));
      await mockBinding(
        context,
        BINDINGS.FULL_TEXT_SEARCH,
        ok({ results: [], total: 0, hasMore: false, nextSearchAfter: [] })
      );
      await use();
    },
    { auto: true },
  ],
});
export { expect } from '@playwright/test';
